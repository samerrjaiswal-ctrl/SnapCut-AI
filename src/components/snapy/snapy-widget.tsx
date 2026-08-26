import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useRouterState } from "@tanstack/react-router";
import { Icon } from "@/components/snapcut/icon";
import { isSnapyCancelled, sendSnapyGenerate } from "@/services/snapy-service";
import { saveSnapyResult } from "@/services/history-service";
import { getUserFacingErrorMessage } from "@/services/image-processing-service";
import { copyImageFromLoader } from "@/lib/copy-image";
import { cn } from "@/lib/utils";

export const SNAPY_OPEN_EVENT = "snapcut:open-snapy";

export function requestOpenSnapy() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SNAPY_OPEN_EVENT));
}

const SUGGESTIONS = [
  "A golden retriever wearing sunglasses on a beach",
  "A cozy cabin in the snow at night",
  "A neon city street in the rain, cinematic",
];
const GENERATE_AGAIN = "Generate another";
const COPY_RESULT = "Copy this image";
const GENERATE_ERROR = "Snapy couldn't generate that image. Please try again.";
const STOPPED = "Stopped. The request was cancelled so credits stay unused.";

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
const CLOSE_MS = 280;
const CLEAR_MS = 360;
const EDIT_GRACE_MS = 4000;
const SILENCE_RMS = 0.02;
const SILENCE_MS = 1_100;
const MIN_SPEECH_MS = 280;
const MAX_RECORD_MS = 60_000;
const STT_SETTLE_MS = 800;
const STT_PREVIEW_MS = 450;

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
    text: `👋 Hey — I’m Snapy.

✨ Describe an image to generate it.

⏸️ After you send, pause in a few seconds to edit — credits stay unused.`,
  };
}

function getSpeechRecognition(): (new () => SpeechRec) | null {
  const speechWindow = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
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
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [threadKey, setThreadKey] = useState(0);
  const [draft, setDraft] = useState("");
  const [voice, setVoice] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [awaitingEdit, setAwaitingEdit] = useState(false);
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
  const recordingRef = useRef(false);
  const busyRef = useRef(false);
  const sendLockRef = useRef(false);
  const prevPathRef = useRef<string | null>(null);
  const closeTimer = useRef<number | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const chatGen = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const graceTimer = useRef<number | null>(null);
  const gracePrompt = useRef("");
  const gracePendingId = useRef<string | null>(null);
  const awaitingEditRef = useRef(false);
  const speechRef = useRef<SpeechRec | null>(null);
  const speechBaseRef = useRef("");
  const spokenRef = useRef("");
  const [lastResultUrl, setLastResultUrl] = useState<string | null>(null);
  const [lastResultBlob, setLastResultBlob] = useState<Blob | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const canSend = Boolean(draft.trim() || voice || recording);
  draftRef.current = draft;
  openRef.current = open;
  closingRef.current = closing;
  recordingRef.current = recording;
  busyRef.current = busy;
  awaitingEditRef.current = awaitingEdit;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      if (graceTimer.current) window.clearTimeout(graceTimer.current);
      if (maxRecordTimer.current) window.clearTimeout(maxRecordTimer.current);
      stopSpeechToText();
      abortRef.current?.abort();
      stopVoiceMonitor();
      stopRecording(true);
      messages.forEach((item) => {
        if (item.imageUrl?.startsWith("blob:")) URL.revokeObjectURL(item.imageUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openPanel() {
    if (openRef.current && !closingRef.current) return;
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    closingRef.current = false;
    setOpen(true);
    setClosing(false);
  }

  function closePanel() {
    if (closingRef.current) return;
    if (!openRef.current) return;
    closingRef.current = true;
    if (recordingRef.current) stopRecording(true);
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (prefersReducedMotion()) {
      setOpen(false);
      setClosing(false);
      closingRef.current = false;
      return;
    }
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      closingRef.current = false;
      closeTimer.current = null;
    }, CLOSE_MS);
  }

  useEffect(() => {
    if (prevPathRef.current === null) {
      prevPathRef.current = pathname;
      return;
    }
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    if (openRef.current || closingRef.current) {
      closePanel();
    }
  }, [pathname]);

  useEffect(() => {
    function onOpenRequest() {
      openPanel();
    }
    window.addEventListener(SNAPY_OPEN_EVENT, onOpenRequest);
    return () => window.removeEventListener(SNAPY_OPEN_EVENT, onOpenRequest);
  }, []);

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
    setAwaitingEdit(false);
    if (graceTimer.current) {
      window.clearTimeout(graceTimer.current);
      graceTimer.current = null;
    }
    gracePendingId.current = null;
    sendLockRef.current = false;
    setLastResultUrl(null);
    setLastResultBlob(null);
    abortRef.current?.abort();
    abortRef.current = null;
    stopSpeechToText();
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

  function startSpeechToText() {
    stopSpeechToText();
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-IN";
    spokenRef.current = "";
    speechBaseRef.current = draftRef.current.trim() ? `${draftRef.current.trim()} ` : "";
    recognition.onresult = (event) => {
      let finals = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        const piece = result?.[0]?.transcript ?? "";
        if (result?.isFinal) finals += `${piece} `;
        else interim += piece;
      }
      const next = `${speechBaseRef.current}${finals}${interim}`.trimStart();
      spokenRef.current = next.trim();
      setDraft(next);
    };
    recognition.onerror = () => {
      /* keep listening even if one recognition pass errors */
    };
    recognition.onend = () => {
      if (!recordingRef.current || speechRef.current !== recognition) return;
      try {
        recognition.start();
      } catch {
        /* already running */
      }
    };
    speechRef.current = recognition;
    try {
      recognition.start();
    } catch {
      speechRef.current = null;
    }
  }

  function stopSpeechToText() {
    const recognition = speechRef.current;
    speechRef.current = null;
    if (!recognition) return;
    try {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.stop();
    } catch {
      try {
        recognition.abort();
      } catch {
        /* already stopped */
      }
    }
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
      for (let i = 0; i < samples.length; i += 1) {
        const sample = samples[i] ?? 0;
        sum += sample * sample;
      }
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

  function stopRecorder(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (!recorder || recorder.state === "inactive") {
        resolve(voiceFileRef.current);
        return;
      }
      const finish = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (blob.size > 0) {
          voiceFileRef.current = blob;
          setVoice(blob);
          resolve(blob);
          return;
        }
        resolve(voiceFileRef.current);
      };
      recorder.onstop = finish;
      try {
        if (typeof recorder.requestData === "function") recorder.requestData();
        recorder.stop();
      } catch {
        finish();
      }
    });
  }

  function finishVoiceAndSend() {
    if (!recordingRef.current) return;
    autoSendRef.current = false;
    stopVoiceMonitor();
    setRecording(false);
    recordingRef.current = false;
    void stopRecorder().then((blob) => settleTranscriptThenSend(blob));
  }

  async function settleTranscriptThenSend(voiceBlob?: Blob | null) {
    stopSpeechToText();
    await new Promise((resolve) => window.setTimeout(resolve, STT_SETTLE_MS));
    const spoken = draftRef.current.trim() || spokenRef.current.trim();
    const audio = voiceBlob ?? voiceFileRef.current;
    if (!spoken && !audio) {
      voiceFileRef.current = null;
      setVoice(null);
      setMessages((current) => [
        ...current,
        { id: newId(), role: "snapy", text: "🎙️ Missed that.\n\nSay it again, or type it." },
      ]);
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, STT_PREVIEW_MS));
    void submitGenerate(spoken, spoken ? null : audio, true);
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
        autoSendRef.current = false;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (blob.size > 0) {
          voiceFileRef.current = blob;
          setVoice(blob);
        }
      };
      recorderRef.current = recorder;
      setRecording(true);
      startSpeechToText();
      recorder.start(250);
      startVoiceMonitor(stream);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: "snapy",
          text: "🎙️ Mic access needed for voice.\n\nYou can also type the prompt.",
        },
      ]);
    }
  }

  function stopRecording(discard: boolean) {
    stopSpeechToText();
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

  async function submitGenerate(promptText: string, voiceOverride?: Blob | null, fromVoice = false) {
    if (busyRef.current || sendLockRef.current) return;
    sendLockRef.current = true;
    const voiceBlob = voiceOverride ?? voiceFileRef.current ?? voice;
    const text = promptText.trim();
    const hasVoice = fromVoice || Boolean(voiceBlob && voiceBlob.size > 0);
    if (!voiceBlob && !text) {
      sendLockRef.current = false;
      setMessages((current) => [
        ...current,
        { id: newId(), role: "snapy", text: "📝 Empty prompt.\n\nSay something, or describe the image." },
      ]);
      return;
    }

    if (!text && !hasVoice) {
      sendLockRef.current = false;
      voiceFileRef.current = null;
      setVoice(null);
      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: "snapy",
          text: "📝 I need the words first.\n\nSpeak again, or type your image prompt.",
        },
      ]);
      return;
    }
    lastPromptRef.current = text;
    setDraft("");
    setMessages((current) => [
      ...current,
      { id: newId(), role: "user", text: text || "🎙️ Voice prompt" },
    ]);

    const pendingId = newId();
    gracePrompt.current = text;
    gracePendingId.current = pendingId;
    setMessages((current) => [
      ...current,
      {
        id: pendingId,
        role: "snapy",
        text: `⏳ Starting in a few seconds…

⏸️ Tap pause to edit the prompt
💳 Credits stay unused until then`,
        pending: true,
      },
    ]);
    setBusy(true);
    setAwaitingEdit(true);
    setVoice(null);
    const gen = chatGen.current;
    const startGenerate = () => {
      if (gen !== chatGen.current) return;
      graceTimer.current = null;
      setAwaitingEdit(false);
      void runImageGenerate(text, text ? null : voiceBlob, pendingId, gen);
    };
    if (prefersReducedMotion()) {
      startGenerate();
      return;
    }
    graceTimer.current = window.setTimeout(startGenerate, EDIT_GRACE_MS);
  }

  async function runImageGenerate(text: string, voiceBlob: Blob | null, pendingId: string, gen: number) {
    const controller = new AbortController();
    abortRef.current = controller;
    setMessages((current) =>
      current.map((item) =>
        item.id === pendingId
          ? { ...item, text: "Creating your image…", pending: true, typing: true }
          : item,
      ),
    );

    try {
      const result = await sendSnapyGenerate({ voice: voiceBlob, prompt: text, signal: controller.signal });
      if (gen !== chatGen.current) return;
      const resultUrl = URL.createObjectURL(result);
      setLastResultUrl(resultUrl);
      setLastResultBlob(result);
      setMessages((current) =>
        current.map((item) =>
          item.id === pendingId
            ? {
                id: pendingId,
                role: "snapy",
                text: "🎨 Here’s the image I generated.",
                imageUrl: resultUrl,
              }
            : item,
        ),
      );
      void saveSnapyResult({ prompt: text || "Voice prompt", resultBlob: result }).catch((error) => {
        if (import.meta.env.DEV) console.error("[SnapCut] Snapy history save failed:", error);
      });
    } catch (error) {
      if (gen !== chatGen.current) return;
      setMessages((current) =>
        current.map((item) =>
          item.id === pendingId
            ? {
                id: pendingId,
                role: "snapy",
                text: isSnapyCancelled(error) ? STOPPED : getUserFacingErrorMessage(error, GENERATE_ERROR),
              }
            : item,
        ),
      );
    } finally {
      sendLockRef.current = false;
      abortRef.current = null;
      if (gen === chatGen.current) {
        setBusy(false);
        setAwaitingEdit(false);
        voiceFileRef.current = null;
        setVoice(null);
      }
    }
  }

  function stopGeneration() {
    if (awaitingEditRef.current || graceTimer.current) {
      if (graceTimer.current) {
        window.clearTimeout(graceTimer.current);
        graceTimer.current = null;
      }
      const pendingId = gracePendingId.current;
      const prompt = gracePrompt.current;
      gracePendingId.current = null;
      setAwaitingEdit(false);
      setBusy(false);
      sendLockRef.current = false;
      voiceFileRef.current = null;
      setVoice(null);
      setDraft(prompt);
      setMessages((current) =>
        current.map((item) =>
          item.id === pendingId
            ? {
                id: item.id,
                role: "snapy",
                text: `⏸️ Paused

Your prompt is back in the box — edit it and send.
💳 No credits were used.`,
              }
            : item,
        ),
      );
      return;
    }
    abortRef.current?.abort();
  }

  async function copyLastResult() {
    const blob = lastResultBlob;
    if (!blob) return;
    try {
      await copyImageFromLoader(async () => blob);
      setMessages((current) => [
        ...current,
        { id: newId(), role: "snapy", text: "📋 Copied the image." },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { id: newId(), role: "snapy", text: "📋 Couldn’t copy that image.\n\nTry again from the image." },
      ]);
    }
  }

  async function copyMessageImage(imageUrl: string) {
    try {
      await copyImageFromLoader(async () => {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error("Could not load this image.");
        return response.blob();
      });
      setMessages((current) => [
        ...current,
        { id: newId(), role: "snapy", text: "📋 Copied the image." },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { id: newId(), role: "snapy", text: "📋 Couldn’t copy that image.\n\nTry again." },
      ]);
    }
  }

  function handleQuickReply(label: string) {
    if (label === COPY_RESULT) {
      void copyLastResult();
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
          aria-label="Snapy image generator"
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
                      <div className="mb-2">
                        <img
                          src={item.imageUrl}
                          alt="Snapy generated image"
                          className="w-full max-h-[min(280px,40dvh)] rounded-xl border border-[#D7E4FF] bg-white object-contain"
                        />
                        <button
                          type="button"
                          className="snapy-btn mt-2 rounded-full border border-[#4F7DFF] bg-white/85 px-3 py-1 text-[12px] text-[#3D6DFF]"
                          onClick={() => void copyMessageImage(item.imageUrl!)}
                        >
                          Copy image
                        </button>
                      </div>
                    ) : null}
                    {item.text && !item.typing ? <p className="whitespace-pre-wrap">{item.text}</p> : null}
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
                  onClick={() => handleQuickReply(COPY_RESULT)}
                >
                  {COPY_RESULT}
                </button>
              </div>
            ) : null}
            </div>
          </div>

          <form className="border-t border-white/50 bg-white/55 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md" onSubmit={onSubmit}>
            {recording || voice ? (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {recording ? (
                  <span className="snapy-chip-in inline-flex max-w-full items-start gap-2 rounded-2xl bg-white/90 px-3 py-2 text-[12px] text-[#1B1B1F] shadow-sm">
                    <span className="shrink-0 text-[#ba1a1a]">Listening</span>
                    <span className="min-w-0 break-words">
                      {draft.trim() || "Speak now — your words will show here"}
                    </span>
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
                placeholder={recording ? "Listening…" : "Describe an image"}
                className="min-w-0 flex-1 bg-transparent py-2 text-[14px] text-[#1B1B1F] outline-none placeholder:text-[#8A8A96]"
                disabled={busy}
              />
              {busy ? (
                <button
                  type="button"
                  className="snapy-btn grid h-9 w-9 place-items-center rounded-full text-[#ba1a1a] hover:bg-white/70"
                  aria-label={awaitingEdit ? "Pause and edit prompt" : "Pause generation"}
                  onClick={stopGeneration}
                >
                  <Icon name="pause" size={20} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="snapy-btn grid h-9 w-9 place-items-center rounded-full text-[#3D6DFF] disabled:opacity-40"
                  aria-label="Send"
                  disabled={!canSend}
                >
                  <Icon name="send" size={20} />
                </button>
              )}
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
          open && !closing && "max-lg:hidden",
        )}
      >
        <button
          type="button"
          className={cn("snapy-fab pointer-events-auto relative h-16 w-16", !open && !closing && "snapy-fab-idle")}
          aria-label={open && !closing ? "Close Snapy" : "Open Snapy"}
          aria-expanded={open && !closing}
          onClick={handleFabClick}
        >
          <span className="snapy-fab-glow" aria-hidden />
          <span className="relative z-[1] grid h-full w-full place-items-center">
            <span className="snapy-fab-disc relative grid h-16 w-16 place-items-center rounded-full bg-white shadow-[0_12px_28px_-10px_rgba(47,92,210,0.65)] ring-2 ring-[#9FC2FF]/70">
              <span className={cn("snapy-fab-mark", open && !closing ? "snapy-fab-mark-hide" : "snapy-fab-mark-show")}>
                <Icon name="dashboard" filled className="text-secondary" size={30} />
              </span>
              <span className={cn("snapy-fab-mark", open && !closing ? "snapy-fab-mark-show" : "snapy-fab-mark-hide")}>
                <Icon name="close" className="text-secondary" size={28} />
              </span>
            </span>
          </span>
        </button>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}
