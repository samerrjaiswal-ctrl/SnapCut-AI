import { spawn } from "node:child_process";
import { answerGeneralQuestion, type SnapyQaHit } from "@/services/snapy-qa";

function runPython(text: string, command = "python") {
  return new Promise<SnapyQaHit | null>((resolve) => {
    const child = spawn(command, ["-m", "snapy_ai.qa"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let out = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve(null);
    }, 2500);
    child.stdout.on("data", (chunk) => {
      out += String(chunk);
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve(null);
        return;
      }
      try {
        const payload = JSON.parse(out) as SnapyQaHit;
        if (payload && typeof payload.text === "string") resolve(payload);
        else resolve(null);
      } catch {
        resolve(null);
      }
    });
    child.stdin.write(JSON.stringify({ text }));
    child.stdin.end();
  });
}

export async function runSnapyQa(text: string): Promise<SnapyQaHit> {
  const fromPython = (await runPython(text, "python")) ?? (await runPython(text, "py"));
  if (fromPython?.text) return fromPython;
  return answerGeneralQuestion(text);
}
