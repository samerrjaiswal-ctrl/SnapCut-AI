"""Snapy multi-engine brain — stdlib ports of NLU, NER, RAG, memory, planner."""

from __future__ import annotations

import json
import math
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from typing import Any

STOP = {
    "the", "a", "an", "to", "of", "in", "on", "for", "and", "or", "is", "my", "me",
    "do", "i", "how", "what", "where", "please", "kya", "hai",
}

TOKEN = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> list[str]:
    return [t for t in TOKEN.findall(text.lower()) if len(t) > 1 and t not in STOP]


class TfidfNLU:
    """Sparse TF-IDF + cosine, sklearn-style without the extra dependency."""

    def __init__(self, labeled: dict[str, list[str]]) -> None:
        self.docs: list[tuple[str, list[str]]] = []
        df: Counter[str] = Counter()
        for label, phrases in labeled.items():
            for phrase in phrases:
                tokens = tokenize(phrase)
                self.docs.append((label, tokens))
                df.update(set(tokens))
        n = max(len(self.docs), 1)
        self.idf = {term: math.log((n + 1) / (count + 1)) + 1 for term, count in df.items()}

    def _vec(self, tokens: list[str]) -> dict[str, float]:
        tf = Counter(tokens)
        return {term: (tf[term] / max(len(tokens), 1)) * self.idf.get(term, 1.0) for term in tf}

    def score(self, text: str) -> dict[str, float]:
        query = self._vec(tokenize(text))
        tallies: dict[str, list[float]] = {}
        for label, tokens in self.docs:
            doc = self._vec(tokens)
            keys = set(query) | set(doc)
            dot = sum(query.get(k, 0) * doc.get(k, 0) for k in keys)
            nq = math.sqrt(sum(v * v for v in query.values())) or 1
            nd = math.sqrt(sum(v * v for v in doc.values())) or 1
            tallies.setdefault(label, []).append(dot / (nq * nd))
        return {label: max(values) for label, values in tallies.items()}


class EntityRecognizer:
    """Lightweight NER for tools, dates, names, and confirmations."""

    TOOLS = {
        "snapy": "snapy",
        "collage": "collage",
        "remove text": "remove-text",
        "ocr": "image-to-text",
        "extractor": "image-to-text",
        "image to text": "image-to-text",
    }

    def extract(self, text: str) -> dict[str, Any]:
        low = text.lower()
        tools = [name for needle, name in self.TOOLS.items() if needle in low]
        name = None
        match = re.search(r"(?:username|user name|name)\s+(?:to\s+)?([a-z0-9 ._-]{2,40})", low)
        if match:
            name = match.group(1).strip()
        return {
            "tools": list(dict.fromkeys(tools)),
            "name": name,
            "confirm": bool(re.search(r"\bconfirm\b", low)),
        }


class GuideRAG:
    """Overlap retrieval over how-to notes, if any are passed in."""

    def __init__(self, corpus: str) -> None:
        self.chunks = [c.strip() for c in re.split(r"\n\n+", corpus) if c.strip()]

    def retrieve(self, query: str, limit: int = 2) -> list[str]:
        q = set(tokenize(query))
        if not q:
            return []
        ranked: list[tuple[float, str]] = []
        for chunk in self.chunks:
            tokens = tokenize(chunk)
            hits = sum(1 for token in tokens if token in q)
            score = hits / math.sqrt(len(tokens) + 1)
            if score >= 0.35:
                ranked.append((score, chunk))
        ranked.sort(reverse=True)
        return [chunk for _, chunk in ranked[:limit]]


@dataclass
class DialogueMemory:
    last_user: str = ""
    last_image: str = ""
    pending_confirm: str | None = None
    turns: list[dict[str, str]] = field(default_factory=list)

    def resolve(self, text: str) -> str:
        low = text.strip().lower()
        if re.match(r"^(yes|yep|haan|confirm|do it|go ahead)\b", low) and self.pending_confirm == "delete_account":
            return "confirm delete my account"
        if re.match(r"^(again|same|wahi|regenerate)\b", low) and self.last_image:
            return self.last_image
        return text


class ToolPlanner:
    """Routes a resolved utterance to a SnapCut tool or chat lane."""

    def plan(self, text: str, nlu: dict[str, float], entities: dict[str, Any]) -> str:
        if nlu.get("image_request", 0) > 0.55 and not entities.get("confirm"):
            return "image_generate"
        if entities.get("name") and re.search(r"(edit|change|update|rename)", text.lower()):
            return "rename"
        if nlu.get("identity", 0) > 0.5:
            return "identity"
        return "chat"


class EnsembleBrain:
    """Votes across NLU, NER, RAG, memory, and the planner."""

    LABELS = {
        "identity": ["who are you", "your name", "what can you do", "logo"],
        "image_request": ["generate image", "draw a picture", "create a photo", "make wallpaper"],
        "account": ["logout", "delete account", "update password", "edit username"],
        "guide": ["how to update password", "how to remove text", "how to use collage"],
    }

    def __init__(self, guide: str) -> None:
        self.nlu = TfidfNLU(self.LABELS)
        self.ner = EntityRecognizer()
        self.rag = GuideRAG(guide)
        self.memory = DialogueMemory()
        self.planner = ToolPlanner()

    def think(self, text: str) -> dict[str, Any]:
        resolved = self.memory.resolve(text)
        scores = self.nlu.score(resolved)
        entities = self.ner.extract(resolved)
        route = self.planner.plan(resolved, scores, entities)
        retrieved = self.rag.retrieve(resolved) if route in {"chat", "guide"} else []
        return {
            "resolved": resolved,
            "nlu": scores,
            "entities": entities,
            "route": route,
            "retrieved": retrieved,
            "engines": ["tfidf-nlu", "ner", "rag", "dialogue-memory", "tool-planner"],
        }


def main() -> None:
    payload = json.loads(sys.stdin.read() or "{}")
    guide = str(payload.get("guide") or "")
    text = str(payload.get("text") or "")
    brain = EnsembleBrain(guide)
    json.dump(brain.think(text), sys.stdout)


if __name__ == "__main__":
    main()
