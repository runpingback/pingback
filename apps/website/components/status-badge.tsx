export function StatusBadge({
  label,
  bg,
  text,
  icon,
}: {
  label: string;
  bg: string;
  text: string;
  icon: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "capitalize" as const,
        backgroundColor: bg,
        color: text,
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
        {label}
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
            backgroundColor: text,
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
            stroke={bg}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: "block" }}
          >
            <path d={icon} />
          </svg>
        </span>
      </span>
    </span>
  );
}
