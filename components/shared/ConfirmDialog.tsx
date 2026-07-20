"use client";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dlg-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,22,29,.5)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 70,
        padding: "1rem",
      }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 12,
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 8px 40px rgba(0,0,0,.2)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "22px 22px 12px" }}>
          <div
            id="confirm-dlg-title"
            style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}
          >
            {title}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55 }}>
            {description}
          </div>
        </div>
        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "0 22px 20px",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 18px",
              background: "transparent",
              color: "var(--ink-soft)",
              border: "1px solid rgba(15,17,23,.18)",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-soft)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 18px",
              background: "var(--red)",
              color: "var(--surface)",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
