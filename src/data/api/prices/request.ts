import { PriceApiError } from "./errors";

const DEFAULT_TIMEOUT_MS = 8000;

export const fetchWithTimeout = async (
    input: RequestInfo | URL,
    init?: RequestInit & { timeoutMs?: number }
) => {
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
        return response;
    } catch (error) {
        if (timedOut) {
            throw new PriceApiError("Request timed out.");
        }
        throw error;
    } finally {
        signal?.removeEventListener("abort", handleAbort);
        clearTimeoutFn(timeoutId);
    }
};
