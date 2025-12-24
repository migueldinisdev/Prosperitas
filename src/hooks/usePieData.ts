import { useMemo } from "react";
import { useAppSelector } from "../store/hooks";
import {
    makeSelectAssetsByPie,
    selectPies,
} from "../store/selectors";

export const usePieData = (pieId?: string) => {
    const pies = useAppSelector(selectPies);
    const assetsSelector = useMemo(
        () => (pieId ? makeSelectAssetsByPie(pieId) : null),
        [pieId]
    );
    const assets = useAppSelector((state) =>
        assetsSelector ? assetsSelector(state) : []
    );

    const pie = pieId ? pies[pieId] : undefined;

    return useMemo(
        () => ({
            pie,
            assets,
            pies,
        }),
        [assets, pie, pies]
    );
};
