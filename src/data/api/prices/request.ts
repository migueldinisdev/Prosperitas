import { PriceApiError } from "./errors";

const DEFAULT_TIMEOUT_MS = 8000;

// Global rate limiter to prevent request spam
const requestTimestamps: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 60;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const consecutiveErrors: number[] = [];
const MAX_CONSECUTIVE_ERRORS = 10;
const ERROR_WINDOW_MS = 30000; // 30 seconds

const canMakeRequest = (): boolean => {
    const now = Date.now();
    
    // Clean up old timestamps
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    while (requestTimestamps.length > 0 && requestTimestamps[0] < cutoff) {
        requestTimestamps.shift();
    }
    
    // Check if we've exceeded the rate limit
    if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
        return false;
    }
    
    // Clean up old error timestamps
    const errorCutoff = now - ERROR_WINDOW_MS;
    while (consecutiveErrors.length > 0 && consecutiveErrors[0] < errorCutoff) {
        consecutiveErrors.shift();
    }
    
    // Check if we've had too many consecutive errors
    if (consecutiveErrors.length >= MAX_CONSECUTIVE_ERRORS) {
        return false;
    }
    
    return true;
};

const recordRequest = () => {
    requestTimestamps.push(Date.now());
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

    // Check rate limit before making request
    if (applyGlobalRateLimit && !canMakeRequest()) {
        throw new PriceApiError("Rate limit exceeded. Too many requests.");
    }

    if (applyGlobalRateLimit) {
        recordRequest();
    }
    
    const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init ?? {};
    const controller = new AbortController();
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
    }
};
