import { useEffect, useMemo } from "react";
import { getPrice, PriceAssetType } from "../data/prices";
import { Asset } from "../core/schema-types";
import { useAppSelector } from "../store/hooks";
import { selectLivePrices } from "../store/selectors";

const normalizeTicker = (ticker: string) => ticker.trim().toUpperCase();

const getAssetPriceRequest = (asset: Asset) => {
    if (asset.assetType === "cash") return null;
    if (asset.assetType === "crypto") {
        const pair = `${asset.ticker}${asset.tradingCurrency ?? ""}`;
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
            return !livePrices[key];
        });

        if (!requestsToFetch.length) {
            return;
        }

        const fetchPrices = async () => {
            await Promise.all(
                requestsToFetch.map(({ request }) =>
                    getPrice(request).catch(() => null)
                )
            );
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
