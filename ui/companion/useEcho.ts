"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type EchoState = "idle" | "listening" | "thinking" | "speaking";
export interface Msg {
  id: number;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const MAX_INPUT = 500;
const MAX_TURNS = 10;

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return C ? new C() : null;
}

/** Chat + voice state for the companion. Streams plain-text tokens from /api/assistant. */
export function useEcho() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [state, setState] = useState<EchoState>("idle");
  const [interim, setInterim] = useState("");
  const [voiceOut, setVoiceOut] = useState(false);
  const [micSupported] = useState(() => !!getRecognition() && !!navigator.mediaDevices?.getUserMedia);
  const level = useRef(0);
  const pulse = useRef(0);
  const rec = useRef<SpeechRecognitionLike | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const abort = useRef<AbortController | null>(null);
  const messagesRef = useRef<Msg[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    return () => {
      abort.current?.abort();
      stopMic();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!voiceOut || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ""));
      u.rate = 1.03;
      u.pitch = 1;
      window.speechSynthesis.speak(u);
    },
    [voiceOut],
  );

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim().slice(0, MAX_INPUT);
      if (!text || state === "thinking" || state === "speaking") return;
      const user: Msg = { id: Date.now(), role: "user", content: text };
      const reply: Msg = { id: Date.now() + 1, role: "assistant", content: "" };
      const history = [...messagesRef.current.filter((m) => !m.error), user].slice(-MAX_TURNS * 2);
      setMessages((m) => [...m, user, reply]);
      setState("thinking");
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      let full = "";
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          const msg = res.status === 429 ? await res.text() : "";
          throw new Error(msg || `status ${res.status}`);
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        setState("speaking");
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = dec.decode(value, { stream: true });
          full += chunk.replace(/\*\*|__|`/g, "");
          pulse.current = 1;
          setMessages((m) => m.map((x) => (x.id === reply.id ? { ...x, content: full } : x)));
        }
        if (!full) throw new Error("empty");
        speak(full);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const rate = (err as Error).message.startsWith("Sid");
        const content = rate
          ? (err as Error).message
          : "Signal lost. Sid's Assistant can't reach the network right now. Try again in a moment, or email Siddhartha at chatrasiddharth@gmail.com.";
        setMessages((m) => m.map((x) => (x.id === reply.id ? { ...x, content, error: true } : x)));
      } finally {
        setState((s) => (s === "listening" ? s : "idle"));
      }
    },
    [state, speak],
  );

  function stopMic() {
    rec.current?.stop();
    rec.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    level.current = 0;
  }

  const toggleMic = useCallback(async () => {
    if (state === "listening") {
      stopMic();
      setState("idle");
      return;
    }
    const r = getRecognition();
    if (!r) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const ctx = new AudioContext();
      audioCtx.current = ctx;
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      ctx.createMediaStreamSource(s).connect(an);
      const buf = new Uint8Array(an.fftSize);
      const tick = () => {
        if (!audioCtx.current) return;
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += ((v - 128) / 128) ** 2;
        level.current = Math.min(1, Math.sqrt(sum / buf.length) * 5);
        requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // mic denied: recognition may still work without the level meter
    }
    r.lang = "en-IN";
    r.interimResults = true;
    r.continuous = false;
    let finalText = "";
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) {
        t += e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText = t;
      }
      setInterim(t);
    };
    r.onend = () => {
      stopMic();
      setInterim("");
      setState("idle");
      if (finalText) send(finalText);
    };
    r.onerror = () => {
      stopMic();
      setState("idle");
    };
    rec.current = r;
    setState("listening");
    r.start();
  }, [state, send]);

  return { messages, state, send, toggleMic, micSupported, interim, voiceOut, setVoiceOut, level, pulse };
}
