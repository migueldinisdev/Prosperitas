import type { PriceProvider } from "../prices";

export const stockProvider: PriceProvider = {
    source: "stock",
    async fetchCandle() {
        return null;
    },
};
