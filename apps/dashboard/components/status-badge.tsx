const statusConfig: Record<string, { bg: string; text: string; icon: string }> = {
  active:   { bg: "#a8b545", text: "#2a1f0a", icon: "M5 13l4 4L19 7" },
  success:  { bg: "#a8b545", text: "#2a1f0a", icon: "M5 13l4 4L19 7" },
  paused:   { bg: "#e8b44a", text: "#2a1f0a", icon: "M10 9v6m4-6v6" },
  pending:  { bg: "#e8b44a", text: "#2a1f0a", icon: "M12 6v6l4 2" },
  running:  { bg: "#e8b44a", text: "#2a1f0a", icon: "M5 12h14" },
  failed:   { bg: "#d4734a", text: "#2a1f0a", icon: "M6 18L18 6M6 6l12 12" },
  inactive: { bg: "#f5f0e8", text: "#2a1f0a", icon: "M5 12h14" },
  info:     { bg: "#8a8a80", text: "#2a1f0a", icon: "M12 16v-4m0-4h.01" },
  warn:     { bg: "#e8b44a", text: "#2a1f0a", icon: "M12 9v4m0 4h.01" },
  error:    { bg: "#d4734a", text: "#2a1f0a", icon: "M12 9v4m0 4h.01" },
  debug:    { bg: "#5bb8a9", text: "#2a1f0a", icon: "M4 7h16M4 12h16M4 17h10" },
};

const fallback = statusConfig.inactive;

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || fallback;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "capitalize" as const,
        backgroundColor: config.bg,
        color: config.text,
        border: "none",
        outline: "none",
        boxShadow: "none",
        position: "relative" as const,
        overflow: "hidden",
        height: "20px",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 0 0 7px",
        }}
      >
        {status}
      </span>
      <span
        style={{
          display: "flex",
          flexDirection: "column" as const,
          justifyContent: "space-between",
          width: "6px",
          marginLeft: "4px",
        }}
      >
        <span
          style={{
            width: "6px",
            height: "3px",
            borderRadius: "0 0 3px 3px",
            backgroundColor: "var(--background)",
            display: "block",
          }}
        />
        <span
          style={{
            width: "6px",
            height: "3px",
            borderRadius: "3px 3px 0 0",
            backgroundColor: "var(--background)",
            display: "block",
          }}
        />
      </span>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "20px",
        }}
      >
        <span
          style={{
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            backgroundColor: config.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            stroke={config.bg}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: "block" }}
          >
            <path d={config.icon} />
          </svg>
        </span>
      </span>
    </span>
  );
}
