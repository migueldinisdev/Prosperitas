import React, { useMemo, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { PieCard } from "./PieCard";
import { Button } from "../../ui/Button";
import { Modal } from "../../ui/Modal";
import { AddPieCard } from "./AddPieCard";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectAssets, selectPies, selectSettings } from "../../store/selectors";
import { addPie } from "../../store/slices/piesSlice";

interface Props {
    onMenuClick: () => void;
}

export const PiesPage: React.FC<Props> = ({ onMenuClick }) => {
    const pies = useAppSelector(selectPies);
    const assets = useAppSelector(selectAssets);
    const settings = useAppSelector(selectSettings);
    const dispatch = useAppDispatch();

    const [isAddOpen, setAddOpen] = useState(false);
    const [pieName, setPieName] = useState("");
    const [pieDescription, setPieDescription] = useState("");
    const [pieRisk, setPieRisk] = useState("");

    const existingNamesLower = useMemo(
        () => new Set(Object.values(pies).map((pie) => pie.name.toLowerCase())),
        [pies]
    );

    const pieNameTrimmed = pieName.trim();
    const isDuplicateName =
        pieNameTrimmed.length > 0 &&
        existingNamesLower.has(pieNameTrimmed.toLowerCase());

    const pieList = useMemo(() => Object.values(pies), [pies]);

    const handleCreatePie = () => {
        const id = `pie_${Date.now()}`;
        const name = pieNameTrimmed || "New Pie";
        if (existingNamesLower.has(name.toLowerCase())) return;
        const riskValue = pieRisk ? Number(pieRisk) : undefined;

        dispatch(
            addPie({
                id,
                name,
                description: pieDescription || undefined,
                risk:
                    riskValue && riskValue >= 1 && riskValue <= 5
                        ? riskValue
                        : undefined,
                assetIds: [],
            })
        );
        setPieName("");
        setPieDescription("");
        setPieRisk("");
        setAddOpen(false);
    };

    return (
        <div className="pb-20">
            <PageHeader
                title="Pies"
                subtitle="Automated investment strategies"
                onMenuClick={onMenuClick}
            />

            <main className="p-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pieList.map((pie) => {
                        const pieAssets = pie.assetIds
                            .map((assetId) => assets[assetId])
                            .filter(Boolean);
                        const totalValue = pieAssets.reduce(
                            (total, asset) =>
                                total + asset.amount * asset.avgCost.value,
                            0
                        );
                        return (
                            <PieCard
                                key={pie.id}
                                pieId={pie.id}
                                name={pie.name}
                                description={pie.description}
                                risk={pie.risk}
                                totalValue={totalValue}
                                assetCount={pieAssets.length}
                                currency={settings.balanceCurrency}
                            />
                        );
                    })}
                    <AddPieCard onClick={() => setAddOpen(true)} />
                </div>
            </main>

            <Modal
                isOpen={isAddOpen}
                onClose={() => setAddOpen(false)}
                title="Create New Pie"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Pie Name
                        </label>
                        <input
                            type="text"
                            value={pieName}
                            onChange={(event) => setPieName(event.target.value)}
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                        {isDuplicateName && (
                            <p className="mt-2 text-sm text-app-warning">
                                A pie with this name already exists.
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Description
                        </label>
                        <input
                            type="text"
                            value={pieDescription}
                            onChange={(event) =>
                                setPieDescription(event.target.value)
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Risk (1-5)
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={5}
                            value={pieRisk}
                            onChange={(event) => setPieRisk(event.target.value)}
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                    </div>
                    <Button
                        className="w-full"
                        onClick={handleCreatePie}
                        disabled={!pieNameTrimmed || isDuplicateName}
                    >
                        Create Pie
                    </Button>
                </div>
            </Modal>
        </div>
    );
};
