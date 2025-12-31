import React, { useMemo, useState } from "react";
import { exportToFile, exportToGoogleDrive } from "../store/sync";
import { SyncStatus, useSyncStatus } from "../store/syncStatus";
import { useAppDispatch } from "../store/hooks";
import { addNotification } from "../store/slices/notificationsSlice";
import {
    GoogleDriveError,
    NoGoogleDriveSaveError,
    GoogleAuthError,
} from "../data/api/google/errors";

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
    const dispatch = useAppDispatch();

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
        } catch (error: any) {
            console.error(error);
            markUnsaved();
            // Map known Google Drive errors to user-friendly notifications
            let message = "An unknown error occurred while saving to Drive.";
            if (error instanceof GoogleAuthError) {
                message =
                    "Authentication with Google Drive failed. Please try again.";
            } else if (error instanceof GoogleDriveError) {
                switch (error.status) {
                    case 401:
                    case 403:
                        message =
                            "Permission denied. Please re-authenticate your Google Drive account.";
                        break;
                    case 404:
                        message =
                            "Drive file not found. Please reconnect your Drive.";
                        break;
                    case 429:
                        message =
                            "Google Drive quota exceeded. Please try again later.";
                        break;
                    case 507:
                        message =
                            "Google Drive storage is full. Please free up space and try again.";
                        break;
                    case 503:
                    case 500:
                        message =
                            "Google Drive service is currently unavailable. Please try again later.";
                        break;
                    default:
                        message = error.message || message;
                }
            } else if (error instanceof NoGoogleDriveSaveError) {
                message =
                    "No Google Drive save file found. Please connect your Drive.";
            } else if (error?.message?.includes("popup")) {
                message =
                    "Popup was blocked. Please enable popups and try again.";
            } else if (error?.message?.includes("Network")) {
                message =
                    "Network error. Please check your connection and try again.";
            }
            dispatch(
                addNotification({
                    type: "error",
                    message,
                    title: "Drive Save Failed",
                    timeout: 7000,
                })
            );
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
