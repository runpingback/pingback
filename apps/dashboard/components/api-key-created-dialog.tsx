"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, Copy } from "lucide-react";

interface ApiKeyCreatedDialogProps {
  apiKey: string | null;
  onClose: () => void;
}

export function ApiKeyCreatedDialog({ apiKey, onClose }: ApiKeyCreatedDialogProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Dialog open={!!apiKey} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>API key created</DialogTitle>
          <DialogDescription>Copy this key now. It will only be shown once.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 p-3 bg-secondary rounded-md border font-mono text-sm break-all">
          <span className="flex-1">{apiKey}</span>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
