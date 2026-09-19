export interface DirtyYahooTicker {
    assetId: string;
    ticker: string;
    message: string;
    markedAt: string;
}

interface YahooTickerAvailability {
    ticker: string;
    availableFrom: string;
    observedAt: string;
}

type Listener = () => void;

let dirtyYahooTickers = new Map<string, DirtyYahooTicker>();
const listeners = new Set<Listener>();
const AVAILABILITY_STORAGE_KEY =
    "prosperitas:yahoo-ticker-availability";
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const normalizeTicker = (ticker: string) => ticker.trim().toUpperCase();

const loadYahooTickerAvailability = () => {
    if (typeof window === "undefined") {
        return new Map<string, YahooTickerAvailability>();
    }
    try {
        const raw = window.localStorage.getItem(AVAILABILITY_STORAGE_KEY);
        if (!raw) return new Map<string, YahooTickerAvailability>();
        const entries = JSON.parse(raw) as YahooTickerAvailability[];
        return new Map(
            entries
                .filter(
                    (entry) =>
                        entry &&
                        normalizeTicker(entry.ticker) &&
                        ISO_DATE_PATTERN.test(entry.availableFrom)
                )
                .map((entry) => [
                    normalizeTicker(entry.ticker),
                    {
                        ...entry,
                        ticker: normalizeTicker(entry.ticker),
                    },
                ])
        );
    } catch {
        return new Map<string, YahooTickerAvailability>();
    }
};

let yahooTickerAvailability = loadYahooTickerAvailability();

const persistYahooTickerAvailability = () => {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(
            AVAILABILITY_STORAGE_KEY,
            JSON.stringify(Array.from(yahooTickerAvailability.values()))
        );
    } catch {
        // Availability metadata is an optimization; pricing still works without it.
    }
};

export const clearYahooTickerStatus = (): void => {
    dirtyYahooTickers = new Map();
    yahooTickerAvailability = new Map();
    if (typeof window !== "undefined") {
        window.localStorage.removeItem(AVAILABILITY_STORAGE_KEY);
    }
    publish();
};

const publish = () => {
    listeners.forEach((listener) => listener());
};

export const subscribeToDirtyYahooTickers = (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const getDirtyYahooTickersSnapshot = () => dirtyYahooTickers;

export const getDirtyYahooTicker = (
    assetId: string,
    ticker: string
): DirtyYahooTicker | null => {
    const status = dirtyYahooTickers.get(assetId);
    if (!status || status.ticker !== normalizeTicker(ticker)) {
        return null;
    }
    return status;
};

export const markYahooTickerDirty = (
    assetId: string,
    ticker: string,
    message: string
) => {
    const normalizedTicker = normalizeTicker(ticker);
    if (!assetId || !normalizedTicker) return;

    const current = dirtyYahooTickers.get(assetId);
    if (
        current?.ticker === normalizedTicker &&
        current.message === message
    ) {
        return;
    }

    dirtyYahooTickers = new Map(dirtyYahooTickers);
    dirtyYahooTickers.set(assetId, {
        assetId,
        ticker: normalizedTicker,
        message,
        markedAt: new Date().toISOString(),
    });
    publish();
};

export const syncYahooTicker = (assetId: string, ticker: string) => {
    const current = dirtyYahooTickers.get(assetId);
    if (!current || current.ticker === normalizeTicker(ticker)) {
        return;
    }

    dirtyYahooTickers = new Map(dirtyYahooTickers);
    dirtyYahooTickers.delete(assetId);
    publish();
};

export const getYahooTickerAvailableFrom = (
    ticker: string
): string | null =>
    yahooTickerAvailability.get(normalizeTicker(ticker))?.availableFrom ??
    null;

export const rememberYahooTickerAvailableFrom = (
    ticker: string,
    availableFrom: string
) => {
    const normalizedTicker = normalizeTicker(ticker);
    if (
        !normalizedTicker ||
        !ISO_DATE_PATTERN.test(availableFrom)
    ) {
        return;
    }

    const current = yahooTickerAvailability.get(normalizedTicker);
    if (current?.availableFrom === availableFrom) return;

    yahooTickerAvailability = new Map(yahooTickerAvailability);
    yahooTickerAvailability.set(normalizedTicker, {
        ticker: normalizedTicker,
        availableFrom,
        observedAt: new Date().toISOString(),
    });
    persistYahooTickerAvailability();
};
