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
  fullName,
  onChange,
}: {
  fullName: string;
  onChange: (signature: Signature | null) => void;
}) {
  const [mode, setMode] = useState<"drawn" | "typed">("drawn");
  const [typed, setTyped] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const drew = useRef(false);

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
    // Read from the token rather than hard-coding ink: canvas takes a colour
    // string, so it is the one place a hex could slip past the design system.
    context.strokeStyle =
      getComputedStyle(document.documentElement).getPropertyValue("--color-ink").trim() ||
      "currentColor";
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
    <div className="mb-5">
      <p className="mb-2 text-sm font-medium text-ink">Your signature</p>

      <div role="tablist" aria-label="Signature method" className="mb-2 flex gap-1">
        {(["drawn", "typed"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={mode === option}
            onClick={() => {
              setMode(option);
              clear();
            }}
            className={`min-h-11 rounded-full border px-4 py-2 text-sm transition-colors ${
              mode === option
                ? "border-gold-border bg-gold-light font-medium text-gold-dark"
                : "border-border-strong text-ink-muted hover:text-ink"
            }`}
          >
            {option === "drawn" ? "Draw signature" : "Type signature"}
          </button>
        ))}
      </div>

      {mode === "drawn" ? (
        <canvas
          ref={canvasRef}
          width={640}
          height={180}
          aria-label="Draw your signature"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="h-[140px] w-full touch-none rounded-lg border-[1.5px] border-dashed border-border-strong bg-surface"
        />
      ) : (
        <>
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
            className="w-full rounded-lg border-[1.5px] border-border-strong bg-surface px-4 py-6 text-center text-3xl italic text-ink placeholder:text-lg placeholder:not-italic placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold"
          />
        </>
      )}

      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="text-sm text-ink-faint">{fullName ? `Signing as ${fullName}` : ""}</p>
        <button
          type="button"
          onClick={clear}
          className="min-h-11 px-2 text-sm font-medium text-ink-muted underline underline-offset-4 hover:text-ink"
        >
          Clear
        </button>
      </div>

      <p className="mt-1 text-sm leading-[1.5] text-ink-faint">
        This digital signature has the same legal standing as a physical signature under the
        Information Technology Act, 2000.
      </p>
    </div>
  );
}
