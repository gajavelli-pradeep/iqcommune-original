/**
 * A panel whose data read failed — shown in place of that one panel so a
 * single unmigrated table or bad read never takes the whole console down.
 *
 * Deliberately its own module, not defined inline in `loadPanels.tsx`: that
 * file starts with `import "server-only"`, and `CachedPanel.tsx` (a client
 * component) needs this same fallback for its cache-miss case. Importing
 * anything from a `server-only` module into client code is a build-time
 * boundary violation, so the tiny presentational component lives here where
 * both the server loader and the client wrapper can import it without either
 * duplicating it or crossing that boundary.
 */
export function PanelError({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-flag-warn-edge bg-flag-warn px-6 py-8 text-center">
      <p className="text-base font-medium text-gold-dark">This section couldn&apos;t load.</p>
      <p className="mt-1 text-sm text-ink-muted">{message}</p>
    </div>
  );
}
