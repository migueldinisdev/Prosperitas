import React, { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { formatQuantity } from "../utils/formatters";
import { Tooltip } from "../ui/Tooltip";

interface QuantityValueProps {
    value: number;
    prefix?: string;
}

/** Shared full-precision quantity, exact-value tooltip and clipboard action. */
export function QuantityValue({ value, prefix = "" }: QuantityValueProps) {
    const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
    const exactQuantity = formatQuantity(value, false);

    useEffect(() => {
        if (copyStatus === "idle") return;
        const timer = window.setTimeout(() => setCopyStatus("idle"), 2000);
        return () => window.clearTimeout(timer);
    }, [copyStatus]);

    const copyLabel = copyStatus === "copied"
        ? "Quantity copied"
        : copyStatus === "error"
          ? "Could not copy quantity. Try again."
          : "Copy quantity";

    return (
        <span className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
            <Tooltip content={`${prefix}${exactQuantity}`}>
                <span className="tabular-nums">{prefix}{formatQuantity(value)}</span>
            </Tooltip>
            <button
                type="button"
                className="inline-flex shrink-0 items-center justify-center rounded p-1 text-app-muted hover:bg-app-surface hover:text-app-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-app-primary"
                aria-label={copyLabel}
                title={copyLabel}
                onClick={async () => {
                    try {
                        // Copy the numeric quantity, without grouping or the
                        // transfer direction marker, ready to paste into inputs.
                        await navigator.clipboard.writeText(exactQuantity);
                        setCopyStatus("copied");
                    } catch {
                        setCopyStatus("error");
                    }
                }}
            >
                {copyStatus === "copied" ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <span className="sr-only" role="status">
                {copyStatus !== "idle" ? copyLabel : ""}
            </span>
        </span>
    );
}
