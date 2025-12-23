import { useMemo } from "react";
import { useAppSelector } from "../store/hooks";
import {
    selectAccount,
    selectAssets,
    selectPies,
    selectSchemaVersion,
    selectSettings,
    selectWallets,
} from "../store/selectors";

export const useHomeData = () => {
    const schemaVersion = useAppSelector(selectSchemaVersion);
    const account = useAppSelector(selectAccount);
    const settings = useAppSelector(selectSettings);
    const wallets = useAppSelector(selectWallets);
    const assets = useAppSelector(selectAssets);
    const pies = useAppSelector(selectPies);

    return useMemo(
        () => ({
            schemaVersion,
            account,
            settings,
            wallets,
            assets,
            pies,
        }),
        [account, assets, pies, schemaVersion, settings, wallets]
    );
};
