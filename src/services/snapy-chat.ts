import { detectSnapyCommand, guideReply, type SnapyCommand } from "@/services/snapy-guide";
import { withTopicJoke } from "@/services/snapy-voice";
import { askGeneralQuestionRemote, formatQaReply } from "@/services/snapy-qa";

export type SnapyIntent = "identity" | "general_chat" | "web_question" | "image_request";

export type SnapyChatAnswer = {
  intent: SnapyIntent;
  text: string;
  imageUrl?: string;
  command?: SnapyCommand;
};

export const SNAPY_LOGO_SRC = "/snapy-logo.png";

const EXPLICIT_IMAGE =
  /\b(generat(?:e|ing)|draw(?:ing)?|paint(?:ing)?|render(?:ing)?|illustrat(?:e|ing)|visuali[sz]e|imagine)\b|\b(create|make|bana(?:o|do)?)\b.{0,40}\b(image|picture|photo|pic|art|illustration|drawing|poster|wallpaper)\b|\b(image|picture|photo|pic).{0,20}\b(bana(?:o|do)?)\b|\b(image|picture|photo|pic) of\b|\bgenerate another\b|\banother variation\b/i;

const IDENTITY =
  /\b(your name|ur name|what(?:'s| is|s) your (?:name|role|job|purpose)|who are you|who made you|who (?:created|built|designed) you|are you (?:an? )?(?:ai|bot|assistant)|what can you do|what do you do|your (?:logo|avatar|icon)|show (?:me )?your (?:logo|avatar|icon)|snapcut(?: ai)?|i(?:'| a)?m snapy|introduce yourself|about (?:you|yourself)|tumhara naam|kaun ho|logo dikhao?)\b/i;

const WEB_HINT =
  /\b(news|headline|stock|share price|weather|forecast|latest|breaking|today'?s|who won|score|population of|capital of|ceo of|founded|released in)\b/i;

const OPINION =
  /\b(favorite|favourite|do you (?:like|think|prefer)|what do you think|opinion|feel about)\b/i;

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/[’]/g, "'");
}

function isQuestion(text: string) {
  return /\?$/.test(text.trim()) || /^(what|who|when|where|why|how|which|is|are|can|do|does|did|kya|kaun|kab|kahan)\b/i.test(text.trim());
}

function isScenePrompt(text: string) {
  const trimmed = text.trim();
  if (isQuestion(trimmed)) return false;
  if (!/^(a|an)\s+\S+/i.test(trimmed)) return false;
  return trimmed.split(/\s+/).length >= 5;
}

function isIdentity(text: string) {
  return IDENTITY.test(text);
}

function isPastPersonalAsk(text: string) {
  return /\b(what|when|which|where).{0,24}\b(did i|have i)\b|\b(my last|my history|my previous)\b/i.test(text);
}

function isUiLocationAsk(text: string) {
  return /\bwhich button\b/i.test(text) || /\bwhere (?:is|are)\b.{0,48}\b(button|tab|icon|menu|link)\b/i.test(text);
}

function isExplicitImage(text: string) {
  if (/don'?t generate|do not generate|not an image|no pictures?/i.test(text)) return false;
  if (isPastPersonalAsk(text)) return false;
  if (wantsLogo(text) && !/\b(generat(?:e|ing)?|draw|paint|render|create|make|bana)/i.test(text)) return false;
  if (EXPLICIT_IMAGE.test(text)) return true;
  return isScenePrompt(text);
}

function isWebQuestion(text: string) {
  if (isIdentity(text) || OPINION.test(text) || isPastPersonalAsk(text) || isUiLocationAsk(text)) return false;
  if (WEB_HINT.test(text)) return true;
  if (/^what is (?:your|snapy|snapcut)\b/.test(text)) return false;
  return /^(what is|who is|when (?:did|was|is)|where is|how many|how much)\b/.test(text) && isQuestion(text);
}

function isSmallTalk(text: string) {
  return /^(hi|hello|hey|yo|sup|thanks|thank you|ok|okay|cool|bye|goodbye|see you|namaste|hola|good (morning|afternoon|evening))\b/.test(
    text,
  );
}

export function classifySnapyIntent(text: string, hasVoice = false): SnapyIntent {
  const raw = text.trim();
  if (!raw) return hasVoice ? "image_request" : "general_chat";
  const t = normalize(raw);

  if (detectSnapyCommand(raw)) return "general_chat";
  if (isExplicitImage(t)) return "image_request";
  if (isIdentity(t)) return "identity";
  if (isWebQuestion(t)) return "web_question";
  if (
    hasVoice &&
    !isSmallTalk(t) &&
    !isQuestion(raw) &&
    !isUiLocationAsk(t) &&
    !/don'?t generate|do not generate|not an image|no pictures?/i.test(t)
  ) {
    return "image_request";
  }
  return "general_chat";
}

export function isImageRequest(text: string, hasVoice = false) {
  return classifySnapyIntent(text, hasVoice) === "image_request";
}

function wantsLogo(text: string) {
  return /\b(logo|avatar|icon|mark)\b/i.test(text);
}

function helloName(userName?: string) {
  const name = userName?.trim().split(/\s+/)[0];
  return name ? `Hello ${name}` : "Hello";
}

function identityReply(text: string, userName?: string): SnapyChatAnswer {
  const t = normalize(text);
  if (wantsLogo(t)) {
    return {
      intent: "identity",
      text: withTopicJoke(
        `🎨 Official mark

👋 I’m Snapy, SnapCut AI’s assistant.
Here’s the real SnapCut AI logo — not a generated image.`,
        "image",
      ),
      imageUrl: SNAPY_LOGO_SRC,
    };
  }
  if (/who made|who (?:created|built|designed)|kisne/.test(t)) {
    return {
      intent: "identity",
      text: `🛠️ Who built me

I’m Snapy, built for SnapCut AI.

🧰 The workspace
• Remove Text
• Image to Text
• Collage Maker
• Image generation`,
    };
  }
  if (/what can you do|what do you do/.test(t)) {
    return {
      intent: "identity",
      text: `✨ What I can do

I chat, answer general questions, and generate images.

🎨 Images → say “generate a …”
🔐 Account → logout, rename, password, or delete account`,
    };
  }
  if (/are you/.test(t)) {
    return {
      intent: "identity",
      text: `🤖 Yep — I’m Snapy

SnapCut AI’s in-app assistant.

📌 I chat here
📌 I generate images only when you ask for one`,
    };
  }
  return {
    intent: "identity",
    text: `👋 ${helloName(userName)}!

I’m Snapy — an AI that chats and generates images.

💬 Ask me anything
🎨 Or say “generate a …” for a picture`,
  };
}

async function webReply(text: string): Promise<SnapyChatAnswer> {
  if (isUiLocationAsk(text)) return generalReply(text);
  const hit = await askGeneralQuestionRemote(text);
  return { intent: "web_question", text: formatQaReply(hit) };
}

async function generalReply(text: string): Promise<SnapyChatAnswer> {
  const t = normalize(text);
  if (/^(hi|hello|hey|yo|sup|good (morning|afternoon|evening)|namaste|hola)\b/.test(t)) {
    return {
      intent: "general_chat",
      text: `👋 Hey! I’m Snapy.

✨ Say “generate a …” for an image`
    };
  }
  if (/thank|shukriya|thanks/.test(t)) {
    return {
      intent: "general_chat",
      text: `🙏 Anytime.

I’m here to chat or cook up an image.`,
    };
  }
  if (/^(ok|okay|cool|nice|great|awesome|got it)\b/.test(t)) {
    return {
      intent: "general_chat",
      text: `👍 Sounds good.

What do you want to do next?`,
    };
  }
  if (/bye|goodbye|see you|later/.test(t)) {
    return {
      intent: "general_chat",
      text: `👋 See you.

Open Snapy anytime.`,
    };
  }
  if (OPINION.test(t)) {
    return {
      intent: "general_chat",
      text: `💭 My take

I like it simple: clear prompts and clean edits.

What are you working on?`
    };
  }
  if (isQuestion(text) && !isUiLocationAsk(text)) {
    const hit = await askGeneralQuestionRemote(text);
    if (hit.hit) return { intent: "general_chat", text: formatQaReply(hit) };
  }
  return {
    intent: "general_chat",
    text: `🤝 I’m with you.

🎨 Image → say “generate …” and describe it
💬 Or just ask me a question`
  };
}

export function commandReply(command: SnapyCommand): SnapyChatAnswer {
  if (command.kind === "logout") {
    return {
      intent: "general_chat",
      text: `🚪 Signing you out

💡 Your files stay saved.`,
      command,
    };
  }
  if (command.kind === "rename") {
    return {
      intent: "general_chat",
      text: `✏️ Updating your name

New name → “${command.name}”`,
      command,
    };
  }
  if (command.kind === "delete_account_ask") {
    return {
      intent: "general_chat",
      text: `⚠️ Delete account?

This permanently deletes your SnapCut account.

✅ If you’re sure, say
“confirm delete my account”`,
      command,
    };
  }
  if (command.kind === "delete_account_confirm") {
    return { intent: "general_chat", text: "⚠️ Deleting your account now.", command };
  }
  return { intent: "general_chat", text: guideReply(command.topic), command };
}

export async function answerSnapyIntent(
  intent: Exclude<SnapyIntent, "image_request">,
  text: string,
  userName?: string,
): Promise<SnapyChatAnswer> {
  const command = detectSnapyCommand(text);
  if (command) return commandReply(command);
  if (intent === "identity") return identityReply(text, userName);
  if (intent === "web_question") return webReply(text);
  return generalReply(text);
}

export async function snapyChatReply(text: string) {
  const intent = classifySnapyIntent(text, false);
  if (intent === "identity") return identityReply(text).text;
  if (intent === "web_question") return (await webReply(text)).text;
  return (await generalReply(text)).text;
}
