import { PriceApiError } from "./errors";

const DEFAULT_TIMEOUT_MS = 8000;

// Global request scheduler to prevent request spam without dropping work.
const requestTimestamps: number[] = [];
const RATE_LIMIT_WINDOW_MS = 1000;
const DEFAULT_REQUESTS_PER_SECOND = 60;
const MIN_REQUESTS_PER_SECOND = 1;
const MAX_REQUESTS_PER_SECOND = 1000;
let maxRequestsPerSecond = DEFAULT_REQUESTS_PER_SECOND;
const MAX_CONCURRENT_REQUESTS = 6;
const consecutiveErrors: number[] = [];
const MAX_CONSECUTIVE_ERRORS = 10;
const ERROR_WINDOW_MS = 30000; // 30 seconds
type ReleaseRequestSlot = () => void;
type QueuedRequest = {
    resolve: (release: ReleaseRequestSlot) => void;
    reject: (reason: Error) => void;
};
const requestQueue: QueuedRequest[] = [];
const activeRequestControllers = new Set<AbortController>();
let activeRequestCount = 0;
let queueTimer: ReturnType<typeof setTimeout> | null = null;
let completedRequestCount = 0;
let totalRequestCount = 0;

export interface PriceRequestQueueProgress {
    completed: number;
    total: number;
    active: number;
    queued: number;
    requestsPerSecond: number;
}

let requestQueueProgress: PriceRequestQueueProgress = {
    completed: 0,
    total: 0,
    active: 0,
    queued: 0,
    requestsPerSecond: DEFAULT_REQUESTS_PER_SECOND,
};
const requestQueueListeners = new Set<() => void>();

export const getPriceRequestQueueProgress = () => requestQueueProgress;

export const subscribeToPriceRequestQueue = (listener: () => void) => {
    requestQueueListeners.add(listener);
    return () => requestQueueListeners.delete(listener);
};

const publishRequestQueueProgress = () => {
    const nextProgress: PriceRequestQueueProgress = {
        completed: completedRequestCount,
        total: totalRequestCount,
        active: activeRequestCount,
        queued: requestQueue.length,
        requestsPerSecond: maxRequestsPerSecond,
    };
    if (
        nextProgress.completed === requestQueueProgress.completed &&
        nextProgress.total === requestQueueProgress.total &&
        nextProgress.active === requestQueueProgress.active &&
        nextProgress.queued === requestQueueProgress.queued &&
        nextProgress.requestsPerSecond ===
            requestQueueProgress.requestsPerSecond
    ) {
        return;
    }
    requestQueueProgress = nextProgress;
    requestQueueListeners.forEach((listener) => listener());
};

const pruneSchedulerHistory = (now: number) => {
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    while (requestTimestamps.length > 0 && requestTimestamps[0] <= cutoff) {
        requestTimestamps.shift();
    }

    const errorCutoff = now - ERROR_WINDOW_MS;
    while (consecutiveErrors.length > 0 && consecutiveErrors[0] <= errorCutoff) {
        consecutiveErrors.shift();
    }
};

const getSchedulerDelay = (now: number) => {
    const rateLimitDelay = requestTimestamps.length >= maxRequestsPerSecond
        ? requestTimestamps[0] + RATE_LIMIT_WINDOW_MS - now
        : 0;
    const errorCooldownDelay = consecutiveErrors.length >= MAX_CONSECUTIVE_ERRORS
        ? consecutiveErrors[0] + ERROR_WINDOW_MS - now
        : 0;
    return Math.max(0, rateLimitDelay, errorCooldownDelay);
};

const scheduleQueueDrain = (delayMs: number) => {
    if (queueTimer !== null) return;
    queueTimer = setTimeout(() => {
        queueTimer = null;
        drainRequestQueue();
    }, Math.max(1, delayMs));
};

const drainRequestQueue = () => {
    const now = Date.now();
    pruneSchedulerHistory(now);

    const delayMs = getSchedulerDelay(now);
    if (delayMs > 0) {
        if (requestQueue.length > 0) {
            scheduleQueueDrain(delayMs);
        }
        return;
    }

    while (
        requestQueue.length > 0 &&
        activeRequestCount < MAX_CONCURRENT_REQUESTS &&
        requestTimestamps.length < maxRequestsPerSecond
    ) {
        const queuedRequest = requestQueue.shift();
        if (!queuedRequest) break;

        activeRequestCount += 1;
        requestTimestamps.push(Date.now());
        let released = false;
        queuedRequest.resolve(() => {
            if (released) return;
            released = true;
            activeRequestCount -= 1;
            completedRequestCount += 1;
            publishRequestQueueProgress();
            drainRequestQueue();
        });
    }
    publishRequestQueueProgress();

    if (
        requestQueue.length > 0 &&
        activeRequestCount < MAX_CONCURRENT_REQUESTS
    ) {
        const nextDelayMs = getSchedulerDelay(Date.now());
        if (nextDelayMs > 0) {
            scheduleQueueDrain(nextDelayMs);
        }
    }
};

const acquireRequestSlot = () =>
    new Promise<ReleaseRequestSlot>((resolve, reject) => {
        if (
            requestQueue.length === 0 &&
            activeRequestCount === 0 &&
            completedRequestCount === totalRequestCount
        ) {
            completedRequestCount = 0;
            totalRequestCount = 0;
        }
        totalRequestCount += 1;
        requestQueue.push({ resolve, reject });
        publishRequestQueueProgress();
        drainRequestQueue();
    });

export const cancelAllPriceRequests = () => {
    const cancelledRequests = requestQueue.splice(0, requestQueue.length);
    const activeRequests = activeRequestControllers.size;
    if (!cancelledRequests.length && activeRequests === 0) return 0;

    if (queueTimer !== null) {
        clearTimeout(queueTimer);
        queueTimer = null;
    }
    completedRequestCount += cancelledRequests.length;
    publishRequestQueueProgress();

    cancelledRequests.forEach(({ reject }) => {
        const error = new Error("Price request cancelled by user.");
        error.name = "AbortError";
        reject(error);
    });
    activeRequestControllers.forEach((controller) => controller.abort());
    return cancelledRequests.length + activeRequests;
};

export const setPriceRequestsPerSecond = (limit: number) => {
    const normalizedLimit = Math.min(
        MAX_REQUESTS_PER_SECOND,
        Math.max(MIN_REQUESTS_PER_SECOND, Math.round(limit))
    );
    if (normalizedLimit === maxRequestsPerSecond) return;

    maxRequestsPerSecond = normalizedLimit;
    if (queueTimer !== null) {
        clearTimeout(queueTimer);
        queueTimer = null;
    }
    publishRequestQueueProgress();
    drainRequestQueue();
};

const recordError = () => {
    consecutiveErrors.push(Date.now());
};

const recordSuccess = () => {
    // Clear error history on successful request
    consecutiveErrors.length = 0;
};

const isAbortError = (error: unknown): boolean =>
    error instanceof DOMException && error.name === "AbortError";

const getRequestUrl = (input: RequestInfo | URL): string => {
    if (typeof input === "string") {
        return input;
    }
    if (input instanceof URL) {
        return input.toString();
    }
    return input.url;
};

const shouldApplyGlobalRateLimit = (input: RequestInfo | URL): boolean => {
    const url = getRequestUrl(input);
    // Typeahead search should not be throttled by unrelated live-price traffic.
    if (url.includes("/api/proxy/stock/search-yahoo")) {
        return false;
    }
    if (url.includes("/api/proxy/stock/search?")) {
        return false;
    }
    return true;
};

export const fetchWithTimeout = async (
    input: RequestInfo | URL,
    init?: RequestInit & { timeoutMs?: number }
) => {
    const applyGlobalRateLimit = shouldApplyGlobalRateLimit(input);
    const releaseRequestSlot = applyGlobalRateLimit
        ? await acquireRequestSlot()
        : null;
    
    const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init ?? {};
    const controller = new AbortController();
    if (applyGlobalRateLimit) {
        activeRequestControllers.add(controller);
    }
    const setTimeoutFn =
        typeof window === "undefined" ? setTimeout : window.setTimeout;
    const clearTimeoutFn =
        typeof window === "undefined" ? clearTimeout : window.clearTimeout;
    let timedOut = false;
    const timeoutId = setTimeoutFn(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);

    const handleAbort = () => controller.abort();
    signal?.addEventListener("abort", handleAbort);
    if (signal?.aborted) {
        controller.abort();
    }

    try {
        const response = await fetch(input, {
            ...rest,
            signal: controller.signal,
        });

        if (applyGlobalRateLimit && !response.ok) {
            recordError();
        } else if (applyGlobalRateLimit) {
            recordSuccess();
        }

        return response;
    } catch (error) {
        // Aborts are expected during typeahead flows and should not trip
        // the global error circuit breaker.
        if (applyGlobalRateLimit && !isAbortError(error)) {
            recordError();
        }
        if (timedOut) {
            throw new PriceApiError("Request timed out.");
        }
        throw error;
    } finally {
        signal?.removeEventListener("abort", handleAbort);
        clearTimeoutFn(timeoutId);
        activeRequestControllers.delete(controller);
        releaseRequestSlot?.();
    }
};
