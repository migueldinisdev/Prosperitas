import type { PriceProvider } from "../prices";

export const forexProvider: PriceProvider = {
    source: "forex",
    async fetchCandle() {
        return null;
    },
};
