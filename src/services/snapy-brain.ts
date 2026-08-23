import type { SnapyCommand } from "@/services/snapy-guide";
import type { SnapyIntent } from "@/services/snapy-chat";

export type SnapyMemory = {
  lastUserText: string;
  lastIntent: SnapyIntent | null;
  lastImagePrompt: string;
  pendingConfirm: "delete_account" | null;
  turns: Array<{ role: "user" | "snapy"; text: string }>;
};

export function emptySnapyMemory(): SnapyMemory {
  return {
    lastUserText: "",
    lastIntent: null,
    lastImagePrompt: "",
    pendingConfirm: null,
    turns: [],
  };
}

export function resolveSnapyFollowUp(text: string, memory: SnapyMemory) {
  const raw = text.trim();
  const t = raw.toLowerCase().replace(/[’]/g, "'");
  if (!raw) return raw;

  if (/^(yes|yep|yeah|haan|ha|confirm|do it|go ahead|kar do)\b/.test(t) && memory.pendingConfirm === "delete_account") {
    return "confirm delete my account";
  }
  if (/^(again|same|wahi|regenerate|one more)\b/.test(t) && memory.lastImagePrompt) {
    return /generat|draw|make|create|image|picture/.test(memory.lastImagePrompt)
      ? memory.lastImagePrompt
      : `generate ${memory.lastImagePrompt}`;
  }
  if (/^(that|this|it|those|them|wahi|wo)\b/.test(t) && memory.lastUserText) {
    return `${memory.lastUserText} ${raw}`;
  }
  return raw;
}

export function rememberSnapyTurn(
  memory: SnapyMemory,
  input: {
    userText: string;
    intent: SnapyIntent;
    command?: SnapyCommand;
    reply?: string;
  },
): SnapyMemory {
  const next: SnapyMemory = {
    ...memory,
    lastUserText: input.userText,
    lastIntent: input.intent,
    pendingConfirm: input.command?.kind === "delete_account_ask" ? "delete_account" : null,
    turns: [
      ...memory.turns,
      { role: "user", text: input.userText },
      ...(input.reply ? [{ role: "snapy" as const, text: input.reply }] : []),
    ].slice(-12),
  };
  if (input.intent === "image_request") next.lastImagePrompt = input.userText;
  return next;
}
