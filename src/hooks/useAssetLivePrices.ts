import { useEffect, useMemo, useRef } from "react";
import { getPrice, PriceAssetType } from "../data/prices";
import { Asset } from "../core/schema-types";
import { useAppSelector } from "../store/hooks";
import { selectLivePrices } from "../store/selectors";

const normalizeTicker = (ticker: string) => ticker.trim().toUpperCase();
const LIVE_PRICE_MAX_AGE_MS = 60 * 60 * 1000;

const isLivePriceFresh = (updatedAt?: string) => {
    if (!updatedAt) return false;
    const updatedAtMs = Date.parse(updatedAt);
    if (Number.isNaN(updatedAtMs)) return false;
    return Date.now() - updatedAtMs < LIVE_PRICE_MAX_AGE_MS;
};

const getAssetPriceRequest = (asset: Asset) => {
    if (asset.assetType === "cash") return null;
    if (asset.assetType === "crypto") {
        const quoteAlias =
            asset.cryptoQuoteAlias?.trim() ||
            (asset.tradingCurrency === "USD"
                ? "USDT"
                : asset.tradingCurrency ?? "");
        const pair = `${asset.ticker}${quoteAlias}`;
        const ticker = normalizeTicker(pair);
        if (!ticker) return null;
        return { type: "crypto" as PriceAssetType, ticker };
    }
    if (!asset.stooqTicker) return null;
    const ticker = normalizeTicker(asset.stooqTicker);
    if (!ticker) return null;
    return { type: "stock" as PriceAssetType, ticker };
};

export const useAssetLivePrices = (assets: Asset[]) => {
    const livePrices = useAppSelector(selectLivePrices);
    const inFlightRequests = useRef(new Set<string>());

    const priceRequests = useMemo(
        () =>
            assets
                .map((asset) => ({
                    assetId: asset.id,
                    request: getAssetPriceRequest(asset),
                }))
                .filter(
                    (
                        entry
                    ): entry is {
                        assetId: string;
                        request: { type: PriceAssetType; ticker: string };
                    } => Boolean(entry.request)
                ),
        [assets]
    );

    useEffect(() => {
        const requestsToFetch = priceRequests.filter(({ request }) => {
            const key = `${request.type}:${request.ticker}`;
            const livePrice = livePrices[key];
            if (inFlightRequests.current.has(key)) {
                return false;
            }
            return !livePrice || !isLivePriceFresh(livePrice.updatedAt);
        });

        if (!requestsToFetch.length) {
            return;
        }

        const fetchPrices = async () => {
            requestsToFetch.forEach(({ request }) => {
                inFlightRequests.current.add(
                    `${request.type}:${request.ticker}`
                );
            });
            await Promise.all(
                requestsToFetch.map(({ request }) =>
                    getPrice(request).catch(() => null)
                )
            );
            requestsToFetch.forEach(({ request }) => {
                inFlightRequests.current.delete(
                    `${request.type}:${request.ticker}`
                );
            });
        };

        fetchPrices();
    }, [livePrices, priceRequests]);

    return useMemo(() => {
        return priceRequests.reduce<Record<string, number>>(
            (map, { assetId, request }) => {
                const key = `${request.type}:${request.ticker}`;
                const livePrice = livePrices[key];
                if (livePrice) {
                    map[assetId] = livePrice.value;
                }
                return map;
            },
            {}
        );
    }, [livePrices, priceRequests]);
};
