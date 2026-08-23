import { withTopicJoke } from "@/services/snapy-voice";

export type SnapyGuideTopic = "password" | "name" | "logout" | "account" | "remove-text" | "ocr" | "collage" | "snapy";

export type SnapyCommand =
  | { kind: "logout" }
  | { kind: "rename"; name: string }
  | { kind: "delete_account_ask" }
  | { kind: "delete_account_confirm" }
  | { kind: "guide"; topic: SnapyGuideTopic };

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/[’]/g, "'");
}

export function detectSnapyCommand(text: string): SnapyCommand | null {
  const t = normalize(text);

  if (/how (?:do i |to )?(update|change|reset) (?:my )?password|update pass|password (?:kaise|update|change|reset)/.test(t)) {
    return { kind: "guide", topic: "password" };
  }
  if (/how (?:do i |to )?change (?:my )?(?:user)?name|naam kaise/.test(t) && !/\bto\s+\S+/.test(t)) {
    return { kind: "guide", topic: "name" };
  }
  if (/how (?:do i |to )?(log ?out|sign out)|logout kaise/.test(t)) {
    return { kind: "guide", topic: "logout" };
  }
  if (/how (?:do i |to )?delete (?:my )?account|account (?:kaise )?delete/.test(t)) {
    return { kind: "guide", topic: "account" };
  }
  if (/how (?:do i |to )?remove text|remove text kaise/.test(t)) {
    return { kind: "guide", topic: "remove-text" };
  }
  if (/how (?:do i |to )?(?:extract text|image to text|ocr|text extractor)/.test(t)) {
    return { kind: "guide", topic: "ocr" };
  }
  if (/how (?:do i |to )?(?:make |use )?collage/.test(t)) {
    return { kind: "guide", topic: "collage" };
  }
  if (/how (?:do i |to )?(?:open |use )?snapy/.test(t)) {
    return { kind: "guide", topic: "snapy" };
  }

  if (/confirm delete my account|confirm account delete/.test(t)) return { kind: "delete_account_confirm" };
  if (/delete my account|delete (this|the) account/.test(t)) return { kind: "delete_account_ask" };
  if (
    /^(please )?(log ?out|sign out|log me out|sign me out)\b/.test(t) ||
    /\b(log me out|sign me out)\b/.test(t)
  ) {
    return { kind: "logout" };
  }
  const rename = t.match(
    /(?:edit|change|update|set|rename)\s+(?:my\s+)?(?:user\s*)?name(?:\s+to)?\s+(.+)/i,
  );
  if (rename?.[1]) {
    const name = rename[1].replace(/[."']/g, "").replace(/\s+(please|pls)$/i, "").trim();
    if (name) return { kind: "rename", name };
  }
  return null;
}

export function guideReply(topic: SnapyGuideTopic): string {
  if (topic === "password") {
    return `🔐 Update your password

✅ Steps
1. Open Settings
2. Tap Update Password
3. If 2FA is on, enter the newest 6-digit authenticator code
4. Type a new password (8+ characters) twice
5. Save, then log in again with the new password

💡 Forgot it while logged out?
On Log In, tap Forgot password.`;
  }
  if (topic === "name") {
    return `✏️ Change your name

✅ Steps
1. Open Settings
2. Edit the name field
3. Tap Save

💬 Or tell me
“edit my username to YourName”`;
  }
  if (topic === "logout") {
    return `🚪 Log out

Tell me “logout”, or use Logout in Settings / the sidebar.
💡 Files stay saved. Logout is not delete.`;
  }
  if (topic === "account") {
    return `⚠️ Delete your account

Open Settings → Delete account.

💬 Or tell me
1. “delete my account”
2. then “confirm delete my account”

🚫 This cannot be undone.`;
  }
  if (topic === "remove-text") {
    return withTopicJoke(
      `🧹 Remove Text

✅ Steps
1. Open Remove Text
2. Upload an image
3. Tap Process`,
      "text",
    );
  }
  if (topic === "ocr") {
    return withTopicJoke(
      `🔤 Image to Text (OCR)

✅ Steps
1. Open Image to Text
2. Upload
3. Process
4. Copy the extracted text`,
      "text",
    );
  }
  if (topic === "collage") {
    return withTopicJoke(
      `🧩 Collage Maker

✅ Steps
1. Open Collage Maker
2. Add photos
3. Arrange
4. Generate`,
      "image",
    );
  }
  return withTopicJoke(
    `🟣 How to use Snapy

✨ You can
• Generate an image (“generate a …”)
• Pause in the first few seconds to edit — credits stay unused`,
    "image",
  );
}
