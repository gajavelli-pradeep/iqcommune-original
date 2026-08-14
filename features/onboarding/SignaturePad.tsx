"use client";

import { useRef, useState } from "react";

/**
 * Signature capture, drawn or typed.
 *
 * The typed mode is not a convenience — it is the accessible path. A canvas you
 * must drag on cannot be operated by keyboard, and a legal signature that only
 * a mouse user can give would exclude people from being empanelled at all. Both
 * modes produce the same thing: a string the server stores.
 *
 * The drawn signature is exported as a data URL. Nothing here is a legal
 * assertion on its own — the timestamp, the IP and the agreement version are
 * captured server-side at submission, where they cannot be edited.
 */

export type Signature =
  | { mode: "drawn"; dataUrl: string }
  | { mode: "typed"; text: string };

export function SignaturePad({
  onChange,
}: {
  onChange: (signature: Signature | null) => void;
}) {
  const [mode, setMode] = useState<"drawn" | "typed">("drawn");
  const [typed, setTyped] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const drew = useRef(false);
  // Resolved once per stroke in start(), not on every pointermove (audit L9).
  const strokeColor = useRef("currentColor");

  function positionOf(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const box = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * canvas.width,
      y: ((event.clientY - box.top) / box.height) * canvas.height,
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    drawing.current = true;
    // Read the ink token once here — canvas takes a colour string, so it is the
    // one place a hex could slip past the design system, but reading it on every
    // pointermove (many/sec) is wasted work.
    strokeColor.current =
      getComputedStyle(document.documentElement).getPropertyValue("--color-ink").trim() ||
      "currentColor";
    const { x, y } = positionOf(event);
    context.beginPath();
    context.moveTo(x, y);
    canvasRef.current?.setPointerCapture(event.pointerId);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const { x, y } = positionOf(event);
    context.lineWidth = 2;
    context.lineCap = "round";
    context.strokeStyle = strokeColor.current;
    context.lineTo(x, y);
    context.stroke();
    drew.current = true;
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas && drew.current) onChange({ mode: "drawn", dataUrl: canvas.toDataURL("image/png") });
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    drew.current = false;
    setTyped("");
    onChange(null);
  }

  return (
    /* V7 .sig-area — 1rem below, a 13px label, pill tabs, then one bordered
       well that both modes render inside. */
    <div className="mb-4">
      <p className="mb-2 text-base font-medium text-ink">Your signature</p>

      {/*
        Toggle buttons, not ARIA tabs (audit A11Y-4): a real tablist owes the
        user arrow-key roving and tabpanel wiring, which these don't implement.
        aria-pressed is the honest role for a two-way mode toggle. V7 uses
        clickable divs, which are neither focusable nor announced.

        `tap-44` rather than `min-h-11`: V7's pill is ~37px tall and growing the
        box would redraw the control, so the hit area grows instead.
      */}
      <div role="group" aria-label="Signature method" className="mb-3 flex gap-1.5">
        {(["drawn", "typed"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => {
              setMode(option);
              clear();
            }}
            className={`tap-44 rounded-full border-[1.5px] px-4 py-1.5 text-base font-medium transition-colors ${
              mode === option
                ? "border-ink bg-ink text-surface"
                : "border-border-strong bg-surface text-ink-muted hover:text-ink"
            }`}
          >
            {option === "drawn" ? "Draw signature" : "Type signature"}
          </button>
        ))}
      </div>

      {/* V7 .sig-canvas-wrap: a solid 1.5px well at 10px radius on surface-soft,
          `relative` so the Clear pill can sit in its top-right corner. */}
      <div className="relative overflow-hidden rounded-[10px] border-[1.5px] border-border-strong bg-surface-soft">
        {mode === "drawn" ? (
          <>
            <canvas
              ref={canvasRef}
              width={640}
              height={180}
              aria-label="Draw your signature"
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerLeave={end}
              className="block h-[140px] w-full touch-none"
            />
            {/* Draw mode only, as V7: typed text is cleared by editing it. */}
            <button
              type="button"
              onClick={clear}
              className="tap-44 absolute right-2 top-2 rounded-full border border-border-strong bg-surface px-2.5 py-[3px] text-xs font-medium text-ink-faint transition-colors hover:text-ink"
            >
              Clear
            </button>
          </>
        ) : (
          <div className="px-4 py-3">
            {/* V7 .sig-typed-preview — the signature is drawn here, at 28px in a
                serif face, while the input below stays ordinary UI text. */}
            <div
              aria-hidden
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              className="min-h-[52px] border-b-[1.5px] border-border-strong pb-1 text-[28px] tracking-[0.02em] text-ink"
            >
              {typed}
            </div>
            <label htmlFor="typed-signature" className="sr-only">
              Type your name to generate signature
            </label>
            <input
              id="typed-signature"
              type="text"
              value={typed}
              placeholder="Type your name to generate signature"
              onChange={(event) => {
                setTyped(event.target.value);
                onChange(
                  event.target.value.trim() ? { mode: "typed", text: event.target.value } : null,
                );
              }}
              className="mt-2 w-full border-none bg-transparent py-1 text-md text-ink outline-none placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold"
            />
          </div>
        )}
      </div>
    </div>
  );
}
