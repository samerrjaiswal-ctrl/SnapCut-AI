import facts from "@/data/snapy-facts.json";

export type SnapyQaHit = {
  text: string;
  hit: boolean;
  engines: string[];
};

const LIVE =
  /\b(news|headline|stock|share price|weather|forecast|latest|breaking|who won|score|today'?s|current weather|gold today)\b/i;

function tokens(text: string) {
  return text.toLowerCase().replace(/[’]/g, "'").split(/[^a-z0-9]+/).filter((item) => item.length > 1);
}

function scoreFact(query: string, fact: (typeof facts)[number]) {
  const q = new Set(tokens(`${query} ${fact.q}`));
  const keys = fact.keys ?? [];
  let hits = 0;
  for (const key of keys) if (q.has(key) || query.toLowerCase().includes(key)) hits += 1;
  const overlap = tokens(fact.q).filter((item) => q.has(item)).length;
  return hits * 2 + overlap;
}

export function answerGeneralQuestion(query: string): SnapyQaHit {
  const raw = query.trim();
  if (!raw) return { text: "", hit: false, engines: ["builtin"] };
  if (LIVE.test(raw)) {
    return {
      hit: true,
      engines: ["builtin"],
      text: `🌍 Live data

I don’t pull live news, weather, scores, or prices.

✅ I can still answer general knowledge (capitals, definitions, science) or help inside SnapCut.`,
    };
  }

  let best = facts[0];
  let bestScore = -1;
  for (const fact of facts) {
    const score = scoreFact(raw, fact);
    if (score > bestScore) {
      best = fact;
      bestScore = score;
    }
  }
  if (!best || bestScore < 3) {
    return {
      hit: false,
      engines: ["builtin"],
      text: `🌍 General knowledge

I don’t have a solid answer for “${raw}”.

✅ Try
• A generate prompt (“generate a …”)
• A static-knowledge question (capitals, what is Python, who created Python)`
    };
  }
  return {
    hit: true,
    engines: ["builtin-tfidf"],
    text: `💡 ${best.a}`,
  };
}

export async function askGeneralQuestionRemote(query: string): Promise<SnapyQaHit> {
  try {
    const response = await fetch("/api/snapy-ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: query }),
    });
    if (!response.ok) return answerGeneralQuestion(query);
    const payload = (await response.json()) as Partial<SnapyQaHit>;
    if (typeof payload.text === "string" && payload.text.trim()) {
      return {
        text: payload.text,
        hit: Boolean(payload.hit),
        engines: Array.isArray(payload.engines) ? payload.engines.map(String) : ["api"],
      };
    }
  } catch {
    /* use local ensemble */
  }
  return answerGeneralQuestion(query);
}

export function formatQaReply(hit: SnapyQaHit) {
  if (!hit.engines.length || hit.engines[0] === "builtin") return hit.text;
  return `${hit.text}\n\n🔬 Engines: ${hit.engines.join(" · ")}`;
}
