"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}

// Global event bus for confirm dialogs
let globalOpen: ((opts: ConfirmOptions) => void) | null = null;

export function confirmAction(opts: ConfirmOptions) {
  if (globalOpen) {
    globalOpen(opts);
  }
}

export function useConfirm() {
  return {
    confirm: confirmAction,
    ConfirmDialog: <ConfirmDialogHost />,
  };
}

function ConfirmDialogHost() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    globalOpen = (opts) => {
      setOptions(opts);
      setLoading(false);
      setOpen(true);
    };
    return () => { globalOpen = null; };
  }, []);

  async function handleConfirm() {
    if (!options) return;
    setLoading(true);
    try {
      await options.onConfirm();
    } finally {
      setLoading(false);
      setOpen(false);
      setOptions(null);
    }
  }

  function handleCancel() {
    setOpen(false);
    setOptions(null);
  }

  if (!mounted || !open || !options) return null;

  return createPortal(
    <>
      <div
        onClick={handleCancel}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          width: "360px",
          maxWidth: "calc(100% - 32px)",
          backgroundColor: "#1a1a17",
          border: "1px solid #2a2a25",
          borderRadius: "8px",
          padding: "20px",
        }}
      >
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#f5f5f0", marginBottom: "6px" }}>
          {options.title}
        </p>
        <p style={{ fontSize: "13px", color: "#8a8a80", marginBottom: "20px", lineHeight: "1.5" }}>
          {options.description}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleConfirm} disabled={loading}>
            {loading ? "..." : options.confirmLabel || "Confirm"}
          </Button>
        </div>
      </div>
    </>,
    document.body,
  );
}
