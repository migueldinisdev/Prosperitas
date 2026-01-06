import type { PriceProvider } from "../prices";

export const cryptoProvider: PriceProvider = {
    source: "crypto",
    async fetchCandle() {
        return null;
    },
};
