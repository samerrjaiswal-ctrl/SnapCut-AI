import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useRouterState } from "@tanstack/react-router";
import { Icon } from "@/components/snapcut/icon";
import { sendSnapyGenerate } from "@/services/snapy-service";
import { getUserFacingErrorMessage } from "@/services/image-processing-service";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "A golden retriever wearing sunglasses on a beach",
  "A cozy cabin in the snow at night",
  "A neon city street in the rain, cinematic",
];
const GENERATE_AGAIN = "Generate another";
const DOWNLOAD_RESULT = "Download this result";
const GENERATE_ERROR = "Snapy couldn't generate that image. Please try again.";
const OPEN_SPIN_MS = 1200;
const CLOSE_MS = 450;
const CLEAR_MS = 420;
const CLOUD_MS = 40_000;
const SILENCE_RMS = 0.02;
const SILENCE_MS = 1_100;
const MIN_SPEECH_MS = 280;
const MAX_RECORD_MS = 60_000;

type ChatMessage = {
  id: string;
  role: "snapy" | "user";
  text?: string;
  imageUrl?: string;
  pending?: boolean;
  typing?: boolean;
};

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayLabel() {
  return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(new Date());
}

function welcomeMessage(): ChatMessage {
  return {
    id: "welcome",
    role: "snapy",
    text: "Describe the image you want, by typing or recording your voice.",
  };
}

function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function SnapyWidget() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [spinDir, setSpinDir] = useState<"open" | "close" | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [threadKey, setThreadKey] = useState(0);
  const [draft, setDraft] = useState("");
  const [voice, setVoice] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcomeMessage()]);
  const listRef = useRef<HTMLDivElement>(null);
  const voiceFileRef = useRef<Blob | null>(null);
  const lastPromptRef = useRef("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const vadRaf = useRef<number | null>(null);
  const maxRecordTimer = useRef<number | null>(null);
  const autoSendRef = useRef(false);
  const draftRef = useRef("");
  const openRef = useRef(false);
  const closingRef = useRef(false);
  const spinDirRef = useRef<"open" | "close" | null>(null);
  const recordingRef = useRef(false);
  const busyRef = useRef(false);
  const sendLockRef = useRef(false);
  const prevPathRef = useRef<string | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const chatGen = useRef(0);
  const [lastResultUrl, setLastResultUrl] = useState<string | null>(null);
  const [cloud, setCloud] = useState<"in" | "out" | null>(null);
  const cloudHide = useRef<number | null>(null);
  const cloudGone = useRef<number | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const canSend = Boolean(draft.trim() || voice || recording);
  draftRef.current = draft;
  openRef.current = open;
  closingRef.current = closing;
  spinDirRef.current = spinDir;
  recordingRef.current = recording;
  busyRef.current = busy;

  function hideCloud() {
    if (cloudHide.current) window.clearTimeout(cloudHide.current);
    if (cloudGone.current) window.clearTimeout(cloudGone.current);
    setCloud((current) => (current ? "out" : null));
    cloudGone.current = window.setTimeout(() => setCloud(null), 320);
  }

  useEffect(() => {
    if (pathname !== "/dashboard") {
      setCloud(null);
      return;
    }
    setCloud("in");
    cloudHide.current = window.setTimeout(() => setCloud("out"), CLOUD_MS);
    cloudGone.current = window.setTimeout(() => setCloud(null), CLOUD_MS + 320);
    return () => {
      if (cloudHide.current) window.clearTimeout(cloudHide.current);
      if (cloudGone.current) window.clearTimeout(cloudGone.current);
    };
  }, [pathname]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    return () => {
      if (openTimer.current) window.clearTimeout(openTimer.current);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      if (maxRecordTimer.current) window.clearTimeout(maxRecordTimer.current);
      if (cloudHide.current) window.clearTimeout(cloudHide.current);
      if (cloudGone.current) window.clearTimeout(cloudGone.current);
      stopVoiceMonitor();
      stopRecording(true);
      messages.forEach((item) => {
        if (item.imageUrl?.startsWith("blob:")) URL.revokeObjectURL(item.imageUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openPanel() {
    if (openRef.current || closingRef.current) return;
    hideCloud();
    if (openTimer.current) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    setOpen(true);
    setClosing(false);
    if (prefersReducedMotion()) {
      setSpinDir(null);
      return;
    }
    setSpinDir("open");
    openTimer.current = window.setTimeout(() => setSpinDir(null), OPEN_SPIN_MS);
  }

  function closePanel() {
    if (closingRef.current) return;
    if (!openRef.current && spinDirRef.current !== "open") return;
    if (openTimer.current) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (recordingRef.current) stopRecording(true);
    if (prefersReducedMotion()) {
      setOpen(false);
      setClosing(false);
      setSpinDir(null);
      return;
    }
    setClosing(true);
    setSpinDir("close");
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setSpinDir(null);
    }, CLOSE_MS);
  }

  useEffect(() => {
    if (prevPathRef.current === null) {
      prevPathRef.current = pathname;
      return;
    }
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    if (openRef.current || closingRef.current || spinDirRef.current === "open") {
      closePanel();
    }
  }, [pathname]);

  function handleFabClick() {
    if (openRef.current || closingRef.current) {
      closePanel();
      return;
    }
    openPanel();
  }

  function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    setClearing(true);
    refreshTimer.current = window.setTimeout(() => {
      resetChat();
      setClearing(false);
      setRefreshing(false);
    }, prefersReducedMotion() ? 0 : CLEAR_MS);
  }

  function resetChat() {
    stopRecording(true);
    chatGen.current += 1;
    setMessages((current) => {
      current.forEach((item) => {
        if (item.imageUrl?.startsWith("blob:")) URL.revokeObjectURL(item.imageUrl);
      });
      return [welcomeMessage()];
    });
    setThreadKey((value) => value + 1);
    setDraft("");
    voiceFileRef.current = null;
    lastPromptRef.current = "";
    setVoice(null);
    setBusy(false);
    sendLockRef.current = false;
    setLastResultUrl(null);
  }

  function stopVoiceMonitor() {
    if (vadRaf.current) {
      window.cancelAnimationFrame(vadRaf.current);
      vadRaf.current = null;
    }
    if (maxRecordTimer.current) {
      window.clearTimeout(maxRecordTimer.current);
      maxRecordTimer.current = null;
    }
    const ctx = audioCtxRef.current;
    audioCtxRef.current = null;
    if (ctx && ctx.state !== "closed") void ctx.close();
  }

  function startVoiceMonitor(stream: MediaStream) {
    stopVoiceMonitor();
    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let heardSpeech = false;
    let speechAt = 0;
    let silentAt = 0;

    const tick = () => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
      const rms = Math.sqrt(sum / samples.length);
      const now = performance.now();
      if (rms >= SILENCE_RMS) {
        if (!heardSpeech) {
          heardSpeech = true;
          speechAt = now;
        }
        silentAt = 0;
      } else if (heardSpeech) {
        if (!silentAt) silentAt = now;
        if (now - silentAt >= SILENCE_MS && now - speechAt >= MIN_SPEECH_MS) {
          finishVoiceAndSend();
          return;
        }
      }
      vadRaf.current = window.requestAnimationFrame(tick);
    };
    vadRaf.current = window.requestAnimationFrame(tick);
    maxRecordTimer.current = window.setTimeout(() => finishVoiceAndSend(), MAX_RECORD_MS);
  }

  function finishVoiceAndSend() {
    if (!recordingRef.current) return;
    autoSendRef.current = true;
    stopRecording(false);
  }

  async function startRecording() {
    if (recordingRef.current) {
      finishVoiceAndSend();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickRecorderMime();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const shouldSend = autoSendRef.current;
        autoSendRef.current = false;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (blob.size > 0) {
          voiceFileRef.current = blob;
          setVoice(blob);
          if (shouldSend) void submitGenerate(draftRef.current, blob);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      startVoiceMonitor(stream);
    } catch {
      setMessages((current) => [
        ...current,
        { id: newId(), role: "snapy", text: "Microphone access is needed for voice prompts. You can also type a description." },
      ]);
    }
  }

  function stopRecording(discard: boolean) {
    stopVoiceMonitor();
    if (discard) autoSendRef.current = false;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecording(false);
    if (discard) {
      chunksRef.current = [];
      voiceFileRef.current = null;
      setVoice(null);
    }
  }

  function sendNow() {
    if (busyRef.current || sendLockRef.current) return;
    if (recordingRef.current) {
      finishVoiceAndSend();
      return;
    }
    void submitGenerate(draftRef.current);
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    sendNow();
  }

  async function submitGenerate(promptText: string, voiceOverride?: Blob | null) {
    if (busyRef.current || sendLockRef.current) return;
    sendLockRef.current = true;
    const voiceBlob = voiceOverride ?? voiceFileRef.current ?? voice;
    const text = promptText.trim();
    if (!voiceBlob && !text) {
      sendLockRef.current = false;
      setMessages((current) => [
        ...current,
        { id: newId(), role: "snapy", text: "Describe the image you want — tap the mic or type a prompt." },
      ]);
      return;
    }

    const userText = [text, voiceBlob ? "Voice prompt attached" : ""].filter(Boolean).join(" · ");
    const pendingId = newId();
    lastPromptRef.current = text;
    setMessages((current) => [
      ...current,
      { id: newId(), role: "user", text: userText },
      { id: pendingId, role: "snapy", text: "Creating your image…", pending: true, typing: true },
    ]);
    setDraft("");
    setBusy(true);
    const gen = chatGen.current;

    try {
      const result = await sendSnapyGenerate({ voice: voiceBlob, prompt: text });
      if (gen !== chatGen.current) return;
      const resultUrl = URL.createObjectURL(result);
      setLastResultUrl(resultUrl);
      setMessages((current) =>
        current.map((item) =>
          item.id === pendingId
            ? { id: pendingId, role: "snapy", text: "Here’s the image I generated.", imageUrl: resultUrl }
            : item,
        ),
      );
    } catch (error) {
      if (gen !== chatGen.current) return;
      setMessages((current) =>
        current.map((item) =>
          item.id === pendingId
            ? {
                id: pendingId,
                role: "snapy",
                text: getUserFacingErrorMessage(error, GENERATE_ERROR),
              }
            : item,
        ),
      );
    } finally {
      sendLockRef.current = false;
      if (gen === chatGen.current) {
        setBusy(false);
        voiceFileRef.current = null;
        setVoice(null);
      }
    }
  }

  function downloadLastResult() {
    if (!lastResultUrl) return;
    const a = document.createElement("a");
    a.href = lastResultUrl;
    a.download = "snapy-image.png";
    a.click();
  }

  function handleQuickReply(label: string) {
    if (label.toLowerCase().includes("download")) {
      downloadLastResult();
      return;
    }
    void submitGenerate(draft || lastPromptRef.current || "Generate another variation of the last image.");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    sendNow();
  }

  const panelOpen = open || closing;

  const overlay = (
    <div className="pointer-events-none fixed inset-0 z-[120]">
      {panelOpen ? (
        <section
          className={cn(
            "snapy-panel pointer-events-auto flex flex-col overflow-hidden",
            closing ? "snapy-panel-out" : "snapy-panel-in",
            "fixed inset-x-3 top-[calc(4.5rem+env(safe-area-inset-top))] bottom-[calc(5.5rem+env(safe-area-inset-bottom))] rounded-[28px]",
            "lg:inset-auto lg:right-6 lg:bottom-24 lg:h-[min(40rem,calc(100dvh-7rem))] lg:w-[24rem]",
          )}
          aria-label="Snapy chatbot"
        >
          <header className="snapy-header flex items-center gap-3 px-4 py-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-white/95 ring-2 ring-white/70">
              <Icon name="dashboard" filled className="text-secondary" size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[15px] text-white truncate">Snapy</p>
              <p className="text-[12px] text-white/85">We’re online</p>
            </div>
            <button
              type="button"
              className="snapy-btn grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/20"
              aria-label="Start a new chat"
              onClick={handleRefresh}
            >
              <span className={refreshing ? "snapy-refresh-spin inline-flex" : "inline-flex"}>
                <Icon name="refresh" size={20} />
              </span>
            </button>
            <button
              type="button"
              className="snapy-btn grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/20"
              aria-label="Close Snapy"
              onClick={closePanel}
            >
              <Icon name="close" size={20} />
            </button>
          </header>

          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 bg-[rgba(236,244,255,0.55)]">
            <div
              key={threadKey}
              className={clearing ? "snapy-thread-out" : "snapy-thread-in"}
            >
            <p className="mb-4 text-center text-[11px] text-[#5B6B8A]">{todayLabel()}</p>
            <div className="flex flex-col gap-3">
              {messages.map((item) => (
                <div
                  key={item.id}
                  className={cn("snapy-bubble-in flex", item.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-[18px] px-3.5 py-2.5 text-[14px] leading-5 shadow-sm",
                      item.role === "user"
                        ? "bg-gradient-to-br from-[#3d6dff] to-[#5b8dff] text-white rounded-br-md"
                        : "bg-white/90 text-[#1B1B1F] rounded-bl-md backdrop-blur-sm",
                    )}
                  >
                    {item.typing ? (
                      <div className="snapy-typing" aria-label="Snapy is generating">
                        <span />
                        <span />
                        <span />
                      </div>
                    ) : null}
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt="Snapy generated image"
                        className="mb-2 w-full max-h-[min(280px,40dvh)] rounded-xl border border-[#D7E4FF] bg-white object-contain"
                      />
                    ) : null}
                    {item.text && !item.typing ? <p>{item.text}</p> : null}
                  </div>
                </div>
              ))}
            </div>

            {messages.length <= 1 ? (
              <div className="mt-4 flex flex-col items-start gap-2">
                {SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="snapy-btn rounded-full border border-[#4F7DFF] bg-white/85 px-4 py-2 text-left text-[13px] text-[#3D6DFF] shadow-sm"
                    onClick={() => {
                      setDraft(item);
                      void submitGenerate(item);
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}

            {lastResultUrl && !busy ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="snapy-btn rounded-full bg-gradient-to-r from-[#3d6dff] to-[#5b8dff] px-4 py-2 text-[13px] text-white shadow-sm"
                  onClick={() => handleQuickReply(GENERATE_AGAIN)}
                >
                  {GENERATE_AGAIN}
                </button>
                <button
                  type="button"
                  className="snapy-btn rounded-full border border-[#4F7DFF] bg-white/85 px-4 py-2 text-[13px] text-[#3D6DFF]"
                  onClick={() => handleQuickReply(DOWNLOAD_RESULT)}
                >
                  {DOWNLOAD_RESULT}
                </button>
              </div>
            ) : null}
            </div>
          </div>

          <form className="border-t border-white/50 bg-white/55 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md" onSubmit={onSubmit}>
            {recording || voice ? (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {recording ? (
                  <span className="snapy-chip-in inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[12px] text-[#ba1a1a] shadow-sm">
                    Listening… pause to send
                  </span>
                ) : null}
                {voice && !recording ? (
                  <span className="snapy-chip-in inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[12px] text-[#3D3D4A] shadow-sm">
                    Voice ready
                    <button type="button" className="snapy-btn" aria-label="Remove voice note" onClick={() => { voiceFileRef.current = null; setVoice(null); }}>
                      <Icon name="close" size={14} />
                    </button>
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 shadow-inner ring-1 ring-[#B7D0FF]">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onComposerKeyDown}
                placeholder="Describe the image you want"
                className="min-w-0 flex-1 bg-transparent py-2 text-[14px] text-[#1B1B1F] outline-none placeholder:text-[#8A8A96]"
                disabled={busy}
              />
              <button
                type="submit"
                className="snapy-btn grid h-9 w-9 place-items-center rounded-full text-[#3D6DFF] disabled:opacity-40"
                aria-label="Send"
                disabled={busy || !canSend}
              >
                <Icon name="send" size={20} />
              </button>
            </div>

            <div className="mt-2 flex items-center gap-1">
              <button
                type="button"
                className="snapy-btn grid h-9 w-9 place-items-center rounded-full text-[#4A5A78] hover:bg-white/70"
                aria-label="Add emoji"
                onClick={() => setDraft((value) => `${value}😊`)}
              >
                <Icon name="mood" size={20} />
              </button>
              <button
                type="button"
                className={cn(
                  "snapy-btn grid h-9 w-9 place-items-center rounded-full hover:bg-white/70",
                  recording ? "text-[#ba1a1a]" : "text-[#4A5A78]",
                )}
                aria-label={recording ? "Stop recording" : "Record voice"}
                onClick={() => void startRecording()}
              >
                <Icon name={recording ? "stop_circle" : "mic"} filled={recording} size={20} />
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div
        className={cn(
          "pointer-events-none fixed z-[121] h-16 w-16",
          "right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] lg:right-6 lg:bottom-6",
          open && !spinDir && !closing && "hidden lg:block",
        )}
      >
        {cloud ? (
          <div
            className={cn("snapy-cloud", cloud === "out" && "snapy-cloud-out")}
            role="status"
          >
            <svg className="snapy-cloud-shape" viewBox="0 0 180 64" aria-hidden>
              <rect x="2" y="2" width="160" height="44" rx="22" fill="#fff" />
              <path fill="#fff" d="M132 40 L168 58 L118 44 Z" />
            </svg>
            <span className="snapy-cloud-text">lets create quickly</span>
          </div>
        ) : null}
        <button
          type="button"
          className={cn(
            "snapy-fab pointer-events-auto relative h-16 w-16",
            !open && !spinDir && "snapy-fab-idle",
            spinDir === "open" && "snapy-fab-spin",
            spinDir === "close" && "snapy-fab-spin-reverse",
          )}
          aria-label={open ? "Close Snapy" : "Open Snapy"}
          aria-expanded={open}
          onClick={handleFabClick}
        >
          <span className="snapy-fab-glow" aria-hidden />
          <span className="snapy-fab-bounce relative z-[1] grid h-full w-full place-items-center">
            <span className="snapy-fab-disc grid h-16 w-16 place-items-center rounded-full bg-white shadow-[0_12px_28px_-10px_rgba(47,92,210,0.65)] ring-2 ring-[#9FC2FF]/70">
              <Icon name="dashboard" filled className="text-secondary" size={30} />
            </span>
          </span>
        </button>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}
