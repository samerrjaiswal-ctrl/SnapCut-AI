"""General Q&A ensemble — uses every installed Python AI lib, falls back if missing."""

from __future__ import annotations

import json
import math
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[1]
FACTS_PATH = ROOT / "src" / "data" / "snapy-facts.json"
TOKEN = re.compile(r"[a-z0-9]+")
LIVE = re.compile(
    r"\b(news|headline|stock|share price|weather|forecast|latest|breaking|who won|score|today'?s|current weather|gold today)\b",
    re.I,
)


def tokenize(text: str) -> list[str]:
    return [t for t in TOKEN.findall(text.lower()) if len(t) > 1]


def load_facts() -> list[dict[str, Any]]:
    if not FACTS_PATH.exists():
        return []
    return json.loads(FACTS_PATH.read_text(encoding="utf-8"))


def builtin_rank(query: str, facts: list[dict[str, Any]]) -> tuple[float, str, str]:
    q = set(tokenize(query))
    best_score = -1.0
    best_answer = ""
    for fact in facts:
        keys = [str(k) for k in fact.get("keys") or []]
        hits = sum(1 for key in keys if key in q or key in query.lower())
        overlap = sum(1 for token in tokenize(str(fact.get("q") or "")) if token in q)
        score = hits * 2 + overlap
        if score > best_score:
            best_score = float(score)
            best_answer = str(fact.get("a") or "")
    return best_score, best_answer, "builtin-tfidf"


def sklearn_rank(query: str, facts: list[dict[str, Any]]) -> tuple[float, str, str] | None:
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
    except Exception:
        return None
    corpus = [f"{fact.get('q', '')} {' '.join(fact.get('keys') or [])} {fact.get('a', '')}" for fact in facts]
    if not corpus:
        return None
    matrix = TfidfVectorizer(stop_words="english").fit_transform([*corpus, query])
    scores = cosine_similarity(matrix[-1], matrix[:-1]).ravel()
    index = int(scores.argmax())
    return float(scores[index]) * 10, str(facts[index].get("a") or ""), "sklearn"


def numpy_rank(query: str, facts: list[dict[str, Any]]) -> tuple[float, str, str] | None:
    try:
        import numpy as np
    except Exception:
        return None
    vocab = sorted({token for fact in facts for token in tokenize(str(fact.get("q", "")) + " " + str(fact.get("a", "")))})
    if not vocab:
        return None
    index = {term: i for i, term in enumerate(vocab)}

    def vec(text: str) -> Any:
        counts = Counter(tokenize(text))
        arr = np.zeros(len(vocab), dtype=float)
        for term, count in counts.items():
            if term in index:
                arr[index[term]] = count
        norm = np.linalg.norm(arr) or 1
        return arr / norm

    qv = vec(query)
    best_score = -1.0
    best_answer = ""
    for fact in facts:
        score = float(np.dot(qv, vec(f"{fact.get('q', '')} {fact.get('a', '')}")))
        if score > best_score:
            best_score = score
            best_answer = str(fact.get("a") or "")
    return best_score * 8, best_answer, "numpy"


def nltk_boost(query: str) -> tuple[float, str, str] | None:
    try:
        import nltk
        from nltk import word_tokenize, pos_tag
    except Exception:
        return None
    try:
        tokens = word_tokenize(query)
        tags = pos_tag(tokens)
    except Exception:
        return None
    nouns = [word for word, tag in tags if tag.startswith("NN")]
    if not nouns:
        return None
    return 0.2, "", "nltk"


def textblob_boost(query: str) -> tuple[float, str, str] | None:
    try:
        from textblob import TextBlob
    except Exception:
        return None
    blob = TextBlob(query)
    phrases = " ".join(blob.noun_phrases)
    if not phrases:
        return None
    return 0.2, "", "textblob"


def transformers_rank(query: str, facts: list[dict[str, Any]]) -> tuple[float, str, str] | None:
    try:
        from transformers import pipeline
    except Exception:
        return None
    context = "\n".join(str(fact.get("a") or "") for fact in facts[:12])
    try:
        qa = pipeline("question-answering", model="distilbert-base-cased-distilled-squad")
        out = qa(question=query, context=context or "SnapCut AI helps edit images.")
        answer = str(out.get("answer") or "")
        score = float(out.get("score") or 0)
        if answer and score > 0.15:
            return score * 10, answer, "transformers"
    except Exception:
        return None
    return None


def sentence_transformers_rank(query: str, facts: list[dict[str, Any]]) -> tuple[float, str, str] | None:
    try:
        from sentence_transformers import SentenceTransformer, util
    except Exception:
        return None
    try:
        model = SentenceTransformer("all-MiniLM-L6-v2")
        answers = [str(fact.get("a") or "") for fact in facts]
        scores = util.cos_sim(model.encode(query), model.encode(answers))[0]
        index = int(scores.argmax())
        return float(scores[index]) * 10, answers[index], "sentence-transformers"
    except Exception:
        return None


def spacy_boost(query: str) -> tuple[float, str, str] | None:
    try:
        import spacy
    except Exception:
        return None
    for name in ("en_core_web_sm", "en_core_web_md"):
        try:
            nlp = spacy.load(name)
            doc = nlp(query)
            if any(ent.label_ in {"GPE", "ORG", "PERSON"} for ent in doc.ents):
                return 0.25, "", "spacy"
        except Exception:
            continue
    return None


def gensim_rank(query: str, facts: list[dict[str, Any]]) -> tuple[float, str, str] | None:
    try:
        from gensim import corpora, models, similarities
    except Exception:
        return None
    texts = [tokenize(f"{fact.get('q', '')} {fact.get('a', '')}") for fact in facts]
    if not texts:
        return None
    dictionary = corpora.Dictionary(texts)
    corpus = [dictionary.doc2bow(text) for text in texts]
    tfidf = models.TfidfModel(corpus)
    index = similarities.MatrixSimilarity(tfidf[corpus])
    vec = tfidf[dictionary.doc2bow(tokenize(query))]
    scores = index[vec]
    pos = int(scores.argmax())
    return float(scores[pos]) * 10, str(facts[pos].get("a") or ""), "gensim"


ADAPTERS: list[Callable[..., tuple[float, str, str] | None]] = [
    sklearn_rank,
    numpy_rank,
    transformers_rank,
    sentence_transformers_rank,
    gensim_rank,
]


def answer(query: str) -> dict[str, Any]:
    q = query.strip()
    if LIVE.search(q):
        return {
            "hit": True,
            "engines": ["policy"],
            "text": "🌍 Live data\n\nI don’t pull live news, weather, scores, or prices.\n\n✅ I can still answer general knowledge or help inside SnapCut.",
        }
    facts = load_facts()
    votes: list[tuple[float, str, str]] = [builtin_rank(q, facts)]
    engines = ["builtin-tfidf"]
    for adapter in ADAPTERS:
        result = adapter(q, facts)
        if result:
            votes.append(result)
            engines.append(result[2])
    for boost in (nltk_boost, textblob_boost, spacy_boost):
        extra = boost(q)
        if extra:
            engines.append(extra[2])
            if votes:
                top = max(votes, key=lambda item: item[0])
                votes.append((top[0] + extra[0], top[1], extra[2]))
    winner = max(votes, key=lambda item: item[0])
    if winner[0] < 3 and winner[2] == "builtin-tfidf":
        return {
            "hit": False,
            "engines": list(dict.fromkeys(engines)),
            "text": f"🌍 General knowledge\n\nI don’t have a solid answer for “{q}”.",
        }
    return {
        "hit": True,
        "engines": list(dict.fromkeys(engines)),
        "text": f"💡 {winner[1]}",
    }


def main() -> None:
    payload = json.loads(sys.stdin.read() or "{}")
    json.dump(answer(str(payload.get("text") or "")), sys.stdout)


if __name__ == "__main__":
    main()
