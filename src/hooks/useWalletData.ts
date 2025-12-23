import { useMemo } from "react";
import { useAppSelector } from "../store/hooks";
import {
    makeSelectWalletById,
    makeSelectWalletCash,
    makeSelectWalletPositions,
    makeSelectWalletTxByWallet,
    makeSelectWalletTxIds,
    selectAssets,
} from "../store/selectors";

export const useWalletData = (walletId?: string) => {
    const assets = useAppSelector(selectAssets);

    const walletSelector = useMemo(
        () => (walletId ? makeSelectWalletById(walletId) : null),
        [walletId]
    );
    const walletCashSelector = useMemo(
        () => (walletId ? makeSelectWalletCash(walletId) : null),
        [walletId]
    );
    const walletTxIdsSelector = useMemo(
        () => (walletId ? makeSelectWalletTxIds(walletId) : null),
        [walletId]
    );
    const walletTxSelector = useMemo(
        () => (walletId ? makeSelectWalletTxByWallet(walletId) : null),
        [walletId]
    );
    const walletPositionsSelector = useMemo(
        () => (walletId ? makeSelectWalletPositions(walletId) : null),
        [walletId]
    );

    const wallet = useAppSelector((state) =>
        walletSelector ? walletSelector(state) : undefined
    );
    const walletCash = useAppSelector((state) =>
        walletCashSelector ? walletCashSelector(state) : undefined
    );
    const walletTxIds = useAppSelector((state) =>
        walletTxIdsSelector ? walletTxIdsSelector(state) : []
    );
    const walletTransactions = useAppSelector((state) =>
        walletTxSelector ? walletTxSelector(state) : []
    );
    const walletPositions = useAppSelector((state) =>
        walletPositionsSelector ? walletPositionsSelector(state) : {}
    );

    return useMemo(
        () => ({
            wallet,
            walletCash,
            walletTxIds,
            walletTransactions,
            walletPositions,
            assets,
        }),
        [assets, wallet, walletCash, walletPositions, walletTransactions, walletTxIds]
    );
};
