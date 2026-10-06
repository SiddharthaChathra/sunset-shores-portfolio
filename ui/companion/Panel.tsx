"use client";

import { useEffect, useRef, useState } from "react";
import { theme } from "@/theme/theme";
import { Phone } from "../phone/Phone";
import { ShaderCanvas, hex3 } from "./ShaderCanvas";
import { WAVE_FRAG } from "./shaders";
import { useEcho, type EchoState, type Msg } from "./useEcho";
import { SiriOrb } from "./SiriOrb";

const QUESTS = ["What is NetSentinel?", "Tell me about his internships", "Which certificates has he earned?", "What's his cloud and DevOps experience?"];
const MODE: Record<EchoState, number> = { idle: 0, listening: 1, thinking: 2, speaking: 3 };
const STATE_LABEL: Record<EchoState, string> = { idle: "Online", listening: "Listening…", thinking: "Typing…", speaking: "Replying" };
const [C1, C2, C3, C4] = theme.companion.ribbons.map(hex3);

type NumRef = { current: number };
function waveUniforms(state: EchoState, level: NumRef, pulse: NumRef, amp: NumRef) {
  const target = state === "listening" ? 0.08 + level.current * 0.32 : state === "thinking" ? 0.16 : state === "speaking" ? 0.12 + pulse.current * 0.2 : 0.06;
  pulse.current *= 0.9;
  amp.current += (target - amp.current) * 0.12;
  return { uAmp: amp.current, uMode: MODE[state], uLevel: level.current, uPulse: pulse.current, uC1: C1, uC2: C2, uC3: C3, uC4: C4 };
}

/** Chat bubble typewriter over the streamed text; click to skip. */
function Typewriter({ text, done }: { text: string; done: boolean }) {
  const [n, setN] = useState(0);
  const [skip, setSkip] = useState(false);
  useEffect(() => {
    if (skip || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const dt = t - last;
      last = t;
      setN((v) => Math.min(text.length, v + Math.max(1, Math.round(dt * 0.08 * (text.length - v > 120 ? 2 : 1)))));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, skip]);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const shown = skip || reduced ? text : text.slice(0, n);
  const typing = shown.length < text.length || !done;
  return (
    <span onClick={() => setSkip(true)} className={typing ? "cursor-pointer" : undefined} title={typing ? "Tap to skip" : undefined}>
      <span className="sr-only">{done ? text : ""}</span>
      <span aria-hidden className="whitespace-pre-wrap">
        {shown}
        {typing && <span className="ml-0.5 inline-block h-[1em] w-[6px] translate-y-[2px] animate-pulse rounded-full bg-accent" />}
      </span>
    </span>
  );
}

function Bubble({ m, last, streaming }: { m: Msg; last: boolean; streaming: boolean }) {
  if (m.role === "user") {
    return (
      <li className="max-w-[82%] self-end rounded-[20px] rounded-br-[6px] px-4 py-2 text-[14px] leading-snug font-semibold text-ink" style={{ background: "var(--grad)" }}>
        {m.content}
      </li>
    );
  }
  return (
    <li className="max-w-[88%] self-start" data-testid="echo-reply">
      <div className={`rounded-[20px] rounded-bl-[6px] px-4 py-2.5 text-[14px] leading-relaxed text-ink ${m.error ? "bg-[#fff0ea] shadow-[inset_0_0_0_1.5px_#FF7A59]" : "card"}`}>
        {m.content ? (
          <Typewriter text={m.content} done={!(last && streaming)} />
        ) : (
          <span className="flex gap-1 py-1.5" aria-label="Sid's Assistant is typing">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </span>
        )}
      </div>
    </li>
  );
}

export function Panel({ edge, orb, onClose }: { edge: "left" | "right" | "bottom"; orb: { x: number; y: number }; onClose: () => void }) {
  const { messages, state, send, toggleMic, micSupported, interim, voiceOut, setVoiceOut, level, pulse } = useEcho();
  const [input, setInput] = useState("");
  const list = useRef<HTMLUListElement>(null);
  const amp = useRef(0.08);
  const [layout, setLayout] = useState<React.CSSProperties>({});

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [messages, state]);

  useEffect(() => {
    const place = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const W = 392;
      const H = Math.min(640, vh - 40);
      if (vw < 700) {
        setLayout({ left: 8, right: 8, top: 8, bottom: 8 });
        return;
      }
      const top = Math.min(Math.max(20, orb.y - H / 2), vh - H - 20);
      if (edge === "right") setLayout({ width: W, height: H, top, right: vw - orb.x + 32 + 14 });
      else if (edge === "left") setLayout({ width: W, height: H, top, left: orb.x + 32 + 14 });
      else setLayout({ width: W, height: H, bottom: vh - orb.y + 32 + 14, left: Math.min(Math.max(16, orb.x - W / 2), vw - W - 16) });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [edge, orb.x, orb.y]);

  const streaming = state === "thinking" || state === "speaking";
  const submit = (t: string) => {
    if (!t.trim()) return;
    send(t);
    setInput("");
  };

  return (
    <div className="pointer-events-auto absolute" style={layout} data-testid="echo-panel">
      <Phone
        app="messages"
        title={theme.companion.name}
        subtitle={undefined}
        height="100%"
        className="!h-full"
        tilt={false}
        icon={
          <span className="block h-[34px] w-[34px] shrink-0">
            <SiriOrb active={state !== "idle"} />
          </span>
        }
        action={
          <span className="flex items-center gap-1.5">
            <button type="button" aria-pressed={voiceOut} onClick={() => setVoiceOut(!voiceOut)} className="pill !h-8 !px-2.5 !text-[11.5px]" aria-label={voiceOut ? "Turn voice replies off" : "Turn voice replies on"}>
              🔊 {voiceOut ? "On" : "Off"}
            </button>
            <button type="button" onClick={onClose} className="pill !h-8 !w-8 !justify-center !px-0" aria-label="Close the assistant">
              ✕
            </button>
          </span>
        }
      >
        <div className="flex h-full flex-col">
          <p className="px-5 pt-1 font-mono text-[11px] font-bold text-teal-ink">
            ● <span data-testid="echo-state" data-state={state}>{STATE_LABEL[state]}</span>
          </p>
          <div className="relative mx-4 mt-2 h-[76px] shrink-0 overflow-hidden rounded-[16px] bg-[linear-gradient(180deg,#fff,#fff1f6)] shadow-[inset_0_0_0_1px_rgb(255_79_139/0.15)]">
            <ShaderCanvas frag={WAVE_FRAG} className="absolute inset-0 h-full w-full" getUniforms={() => waveUniforms(state, level, pulse, amp)} />
          </div>
          <ul ref={list} className="mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-2" data-lenis-prevent aria-live="polite" aria-label="Conversation">
            {messages.length === 0 && (
              <li className="max-w-[88%] self-start">
                <div className="card rounded-[20px] rounded-bl-[6px] px-4 py-2.5 text-[14px] leading-relaxed text-ink">
                  Hey! I&apos;m Sid&apos;s Assistant. Ask me anything about his projects, internships, certificates or skills. Quick replies are just below.
                </div>
              </li>
            )}
            {messages.map((m, i) => (
              <Bubble key={m.id} m={m} last={i === messages.length - 1} streaming={streaming} />
            ))}
            {interim && <li className="self-end text-[13px] text-ink-soft italic">{interim}</li>}
          </ul>
          <div className="border-t border-ink/8 bg-white/70 px-3 pt-2 pb-3">
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1" aria-label="Quick replies">
              {QUESTS.map((q) => (
                <button key={q} type="button" disabled={streaming} onClick={() => submit(q)} className="pill shrink-0 !h-8 !text-[12.5px] whitespace-nowrap disabled:opacity-50">
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(input);
              }}
              className="flex items-center gap-2"
            >
              <label htmlFor="echo-input" className="sr-only">
                Message Sid&apos;s Assistant
              </label>
              <input
                id="echo-input"
                data-autofocus
                value={input}
                maxLength={500}
                onChange={(e) => setInput(e.target.value)}
                placeholder="iMessage… ask about his work"
                autoComplete="off"
                className="h-11 min-w-0 flex-1 rounded-full bg-white px-4 text-[14px] text-ink shadow-[inset_0_0_0_1.5px_rgb(35_32_58/0.15)] outline-none placeholder:text-ink-soft focus:shadow-[inset_0_0_0_2px_var(--accent-strong)]"
              />
              {micSupported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  aria-pressed={state === "listening"}
                  aria-label={state === "listening" ? "Stop listening" : "Speak your question"}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${state === "listening" ? "bg-ink text-white" : "bg-white text-ink shadow-[inset_0_0_0_1.5px_rgb(35_32_58/0.15)]"}`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="5.5" y="1.5" width="5" height="8" rx="2.5" />
                    <path d="M3 7.5a5 5 0 0010 0M8 12.5v2" strokeLinecap="round" />
                  </svg>
                </button>
              )}
              <button
                type="submit"
                disabled={!input.trim() || streaming}
                aria-label="Send"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink disabled:opacity-50"
                style={{ background: "var(--grad)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </Phone>
    </div>
  );
}
