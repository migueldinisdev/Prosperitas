import React, { useMemo, useState } from "react";
import { exportToFile, exportToGoogleDrive } from "../store/sync";
import { SyncStatus, useSyncStatus } from "../store/syncStatus";

const STATUS_LABELS: Record<SyncStatus, string> = {
    saved: "Saved",
    unsaved: "Unsaved",
    saving: "Saving...",
    "up-to-date": "Up to date",
};

export const SyncStatusPills: React.FC = () => {
    const { mode, status, markSaving, markSaved, markUnsaved } =
        useSyncStatus();
    const [isWorking, setIsWorking] = useState(false);

    const canSave = status === "unsaved" && !isWorking && mode !== null;

    const handleSave = async () => {
        if (!canSave) return;
        setIsWorking(true);

        try {
            if (mode === "cloud") {
                markSaving();
                await exportToGoogleDrive();
                markSaved("up-to-date");
            } else if (mode === "offline") {
                await exportToFile();
                markSaved("saved");
            }
        } catch (error) {
            console.error(error);
            markUnsaved();
        } finally {
            setIsWorking(false);
        }
    };

    const modeLabel = useMemo(() => {
        if (!mode) return null;
        return mode === "cloud" ? "Cloud" : "Offline";
    }, [mode]);

    if (!modeLabel) {
        return null;
    }

    const getModeColor = () => {
        if (mode === "cloud") {
            return "border-blue-500/40 bg-blue-500/10 text-blue-600";
        }
        return "border-app-border bg-app-card text-app-muted";
    };

    const getStatusColor = () => {
        if (status === "up-to-date") {
            return "border-green-500/40 bg-green-500/10 text-green-600";
        }
        if (status === "saving") {
            return "border-yellow-500/40 bg-yellow-500/10 text-yellow-600";
        }
        if (canSave) {
            return "border-app-primary/40 bg-app-primary/10 text-app-primary hover:bg-app-primary/20";
        }
        return "border-app-border bg-app-card text-app-muted";
    };

    return (
        <div className="flex items-center gap-2">
            {/* <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getModeColor()}`}
            >
                {modeLabel}
            </span> */}
            {mode === "cloud" && (
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!canSave}
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${getStatusColor()}`}
                    aria-label={canSave ? "Save changes" : "Sync status"}
                >
                    {STATUS_LABELS[status]}
                </button>
            )}
        </div>
    );
};
