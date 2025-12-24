import React from "react";
import { useHomeData } from "../hooks/useHomeData";
import { Card } from "../ui/Card";

export const StateSnapshotCard: React.FC = () => {
    const { schemaVersion, wallets, assets, pies } = useHomeData();
    const walletCount = Object.keys(wallets).length;
    const assetCount = Object.keys(assets).length;
    const pieCount = Object.keys(pies).length;

    return (
        <Card title="Data Snapshot (Redux)">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                        Schema Version
                    </p>
                    <p className="text-lg font-semibold text-app-foreground">
                        {schemaVersion}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                        Wallets
                    </p>
                    <p className="text-lg font-semibold text-app-foreground">
                        {walletCount}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                        Assets in Catalog
                    </p>
                    <p className="text-lg font-semibold text-app-foreground">
                        {assetCount}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                        Pies
                    </p>
                    <p className="text-lg font-semibold text-app-foreground">
                        {pieCount}
                    </p>
                </div>
            </div>
        </Card>
    );
};
