type LogCtx = Record<string, unknown>;

function emit(level: "info" | "warn" | "error", msg: string, ctx?: LogCtx) {
  const entry = JSON.stringify({ level, msg, ...ctx, ts: new Date().toISOString() });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.log(entry);
}

export const log = {
  info: (msg: string, ctx?: LogCtx) => emit("info", msg, ctx),
  warn: (msg: string, ctx?: LogCtx) => emit("warn", msg, ctx),
  error: (msg: string, ctx?: LogCtx) => emit("error", msg, ctx),
};
