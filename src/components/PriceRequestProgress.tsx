import React, { useEffect, useSyncExternalStore } from "react";
import { LoaderCircle, X } from "lucide-react";
import { useAppSelector } from "../store/hooks";
import { selectSettings } from "../store/selectors";
import {
    cancelAllPriceRequests,
    getPriceRequestQueueProgress,
    setPriceRequestsPerSecond,
    subscribeToPriceRequestQueue,
} from "../data/api/prices/request";

export const PriceRequestProgress: React.FC = () => {
    const requestsPerSecond = useAppSelector(
        (state) => selectSettings(state).priceRequestsPerSecond
    );
    const progress = useSyncExternalStore(
        subscribeToPriceRequestQueue,
        getPriceRequestQueueProgress,
        getPriceRequestQueueProgress
    );

    useEffect(() => {
        setPriceRequestsPerSecond(requestsPerSecond);
    }, [requestsPerSecond]);
    const isRunning =
        progress.total > 0 &&
        (progress.completed < progress.total ||
            progress.active > 0 ||
            progress.queued > 0);

    if (!isRunning) return null;

    const percentage = Math.min(
        100,
        Math.round((progress.completed / progress.total) * 100)
    );

    return (
        <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-40 lg:left-[17rem]">
            <div
                className="pointer-events-auto mx-auto max-w-lg rounded-xl border border-app-border bg-app-card/95 p-4 shadow-xl backdrop-blur-md"
                role="status"
                aria-live="polite"
            >
                <div className="mb-2 flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2">
                        <LoaderCircle
                            size={16}
                            className="shrink-0 animate-spin text-app-primary"
                        />
                        <span className="truncate text-sm font-medium text-app-foreground">
                            Loading historical prices
                        </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs font-semibold text-app-muted">
                            {progress.completed} / {progress.total}
                        </span>
                        <button
                            type="button"
                            onClick={cancelAllPriceRequests}
                            disabled={
                                progress.queued === 0 && progress.active === 0
                            }
                            className="rounded-lg p-1 text-app-muted transition-colors hover:bg-app-surface hover:text-app-foreground disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Cancel all price requests"
                            title="Cancel all price requests"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
                <div
                    className="h-2 overflow-hidden rounded-full bg-app-surface"
                    role="progressbar"
                    aria-label="Historical price request progress"
                    aria-valuemin={0}
                    aria-valuemax={progress.total}
                    aria-valuenow={progress.completed}
                >
                    <div
                        className="h-full rounded-full bg-app-primary transition-[width] duration-300"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <p className="mt-2 text-xs text-app-muted">
                    {progress.active} active · {progress.queued} waiting · Limit {progress.requestsPerSecond}/s
                </p>
            </div>
        </div>
    );
};
