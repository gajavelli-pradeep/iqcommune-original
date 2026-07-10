/* eslint-disable @next/next/no-img-element */
/**
 * IQ brand mark — the official client icon (`public/iq-icon.jpeg`): dark tile,
 * gold "i" + cream "q" with a green accent dot. Same artwork ships as the
 * favicon (`app/icon.jpg`). `borderRadius` clips the source's baked white
 * corners so the rounded tile sits cleanly on any background.
 * `ring` adds a faint gold outline — used on the dark footer where the tile
 * would otherwise blend into the near-ink background.
 */
export function IqMark({ size = 40, ring = false }: { size?: number; ring?: boolean }) {
  return (
    <img
      src="/iq-icon.jpeg"
      alt="iqcommune"
      width={size}
      height={size}
      style={{
        display: "block",
        flexShrink: 0,
        borderRadius: "24%",
        boxShadow: ring ? "0 0 0 1px var(--gold-border)" : undefined,
      }}
    />
  );
}
