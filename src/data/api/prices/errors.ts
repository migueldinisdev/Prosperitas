export class TickerNotFoundError extends Error {
    readonly ticker: string;
    readonly assetType: string;

    constructor(ticker: string, assetType: string, message?: string) {
        super(message ?? `Ticker not found: ${ticker}`);
        this.name = "TickerNotFoundError";
        this.ticker = ticker;
        this.assetType = assetType;
    }
}

export class PriceApiError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "PriceApiError";
    }
}

export class PriceFallbackError extends PriceApiError {
    readonly originalError: Error;
    readonly fallback: unknown;

    constructor(message: string, originalError: Error, fallback: unknown) {
        super(message);
        this.name = "PriceFallbackError";
        this.originalError = originalError;
        this.fallback = fallback;
    }
}
