import { useMemo } from "react";
import { useAppSelector } from "../store/hooks";
import {
    makeSelectAssetById,
    selectAssets,
    selectWalletPositionsState,
} from "../store/selectors";

export const useAssetData = (assetId?: string) => {
    const assets = useAppSelector(selectAssets);
    const walletPositions = useAppSelector(selectWalletPositionsState);

    const assetSelector = useMemo(
        () => (assetId ? makeSelectAssetById(assetId) : null),
        [assetId]
    );
    const asset = useAppSelector((state) =>
        assetSelector ? assetSelector(state) : undefined
    );

    return useMemo(
        () => ({
            asset,
            assets,
            walletPositions,
        }),
        [asset, assets, walletPositions]
    );
};
