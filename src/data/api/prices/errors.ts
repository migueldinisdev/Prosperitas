export interface PriceErrorDetails {
    status?: number;
    code?: string;
    provider?: string;
}

export class TickerNotFoundError extends Error {
    readonly ticker: string;
    readonly assetType: string;
    readonly status: number;
    readonly code?: string;
    readonly provider?: string;

    constructor(
        ticker: string,
        assetType: string,
        message?: string,
        details: PriceErrorDetails = {}
    ) {
        super(message ?? `Ticker not found: ${ticker}`);
        this.name = "TickerNotFoundError";
        this.ticker = ticker;
        this.assetType = assetType;
        this.status = details.status ?? 404;
        this.code = details.code;
        this.provider = details.provider;
    }
}

export class PriceApiError extends Error {
    readonly status?: number;
    readonly code?: string;
    readonly provider?: string;

    constructor(message: string, details: PriceErrorDetails = {}) {
        super(message);
        this.name = "PriceApiError";
        this.status = details.status;
        this.code = details.code;
        this.provider = details.provider;
    }
}

export class PriceBeforeListingError extends PriceApiError {
    readonly ticker: string;
    readonly requestedDate: string;
    readonly availableFrom: string;

    constructor(
        ticker: string,
        requestedDate: string,
        availableFrom: string
    ) {
        super(
            `No Yahoo Finance price exists for ${ticker} before ${availableFrom}.`,
            {
                code: "PRICE_BEFORE_LISTING",
                provider: "yahoo",
            }
        );
        this.name = "PriceBeforeListingError";
        this.ticker = ticker;
        this.requestedDate = requestedDate;
        this.availableFrom = availableFrom;
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
