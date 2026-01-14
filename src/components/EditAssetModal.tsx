import React, { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useAppDispatch } from "../store/hooks";
import { updateAsset } from "../store/slices/assetsSlice";
import { setPieAssets } from "../store/slices/piesSlice";
import type { Asset, PiesState } from "../core/schema-types";
import { StooqAPIStockSelect } from "./StooqAPIStockSelect";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
    pies: PiesState;
}

export const EditAssetModal: React.FC<Props> = ({
    isOpen,
    onClose,
    asset,
    pies,
}) => {
    const dispatch = useAppDispatch();
    const [ticker, setTicker] = useState("");
    const [stooqSearch, setStooqSearch] = useState("");
    const [stooqTicker, setStooqTicker] = useState("");
    const [pieId, setPieId] = useState("");

    const currentPieId = useMemo(() => {
        if (!asset) return "";
        return (
            Object.values(pies).find((pie) =>
                pie.assetIds.includes(asset.id)
            )?.id ?? ""
        );
    }, [asset, pies]);

    useEffect(() => {
        if (!asset) return;
        setTicker(asset.ticker);
        const nextStooq = asset.stooqTicker ?? "";
        setStooqSearch(nextStooq);
        setStooqTicker(nextStooq);
        setPieId(currentPieId);
    }, [asset, currentPieId]);

    const handleSave = () => {
        if (!asset) return;
        const trimmedTicker = ticker.trim();
        if (!trimmedTicker) return;
        const trimmedStooq = stooqTicker.trim();

        dispatch(
            updateAsset({
                id: asset.id,
                changes: {
                    ticker: trimmedTicker,
                    stooqTicker: trimmedStooq ? trimmedStooq : null,
                    updatedAt: new Date().toISOString(),
                },
            })
        );

        Object.values(pies).forEach((pie) => {
            const hasAsset = pie.assetIds.includes(asset.id);
            const shouldHave = pie.id === pieId;
            if (hasAsset === shouldHave) return;
            const nextAssetIds = shouldHave
                ? [...pie.assetIds, asset.id]
                : pie.assetIds.filter((id) => id !== asset.id);
            dispatch(setPieAssets({ id: pie.id, assetIds: nextAssetIds }));
        });

        onClose();
    };

    if (!asset) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Asset">
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-app-muted mb-1">
                        Asset
                    </label>
                    <div className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-muted">
                        {asset.name}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-app-muted mb-1">
                        Ticker
                    </label>
                    <input
                        type="text"
                        value={ticker}
                        onChange={(event) => setTicker(event.target.value)}
                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                    />
                </div>

                {asset.assetType === "stock" ? (
                    <div className="space-y-1">
                        <label className="flex items-center gap-1 text-xs font-medium text-app-muted">
                            Stooq ticker
                            <Info
                                size={12}
                                className="text-app-muted"
                                title="For real-time market pricing, put here the stooq ticker (stooq.com)"
                            />
                        </label>
                        <StooqAPIStockSelect
                            searchValue={stooqSearch}
                            onSearchChange={setStooqSearch}
                            selectedValue={stooqTicker}
                            onSelect={setStooqTicker}
                            placeholder="Search stooq ticker"
                        />
                    </div>
                ) : null}

                <div>
                    <label className="block text-xs font-medium text-app-muted mb-1">
                        Pie
                    </label>
                    <select
                        value={pieId}
                        onChange={(event) => setPieId(event.target.value)}
                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                    >
                        <option value="">No pie</option>
                        {Object.values(pies).map((pie) => (
                            <option key={pie.id} value={pie.id}>
                                {pie.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="pt-2">
                    <Button
                        className="w-full"
                        onClick={handleSave}
                        disabled={!ticker.trim()}
                    >
                        Save Asset
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
