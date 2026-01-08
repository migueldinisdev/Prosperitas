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
