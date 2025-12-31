import React, { useMemo, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { WalletCard } from "./WalletCard";
import { AddWalletCard } from "./AddWalletCard";
import { Button } from "../../ui/Button";
import { Modal } from "../../ui/Modal";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectSettings, selectWallets } from "../../store/selectors";
import { addWallet } from "../../store/slices/walletsSlice";
import { Money } from "../../core/schema-types";

interface Props {
    onMenuClick: () => void;
}

const sumCash = (cash: Money[] | Record<string, number> | undefined) => {
    if (!cash) return 0;
    if (Array.isArray(cash)) {
        return cash.reduce((total, entry) => total + entry.value, 0);
    }
    return Object.values(cash).reduce((total, value) => total + value, 0);
};

export const WalletsPage: React.FC<Props> = ({ onMenuClick }) => {
    const wallets = useAppSelector(selectWallets);
    const settings = useAppSelector(selectSettings);
    const dispatch = useAppDispatch();

    const [isAddOpen, setAddOpen] = useState(false);
    const [walletName, setWalletName] = useState("");
    const [walletDescription, setWalletDescription] = useState("");

    const existingNamesLower = useMemo(
        () => new Set(Object.values(wallets).map((w) => w.name.toLowerCase())),
        [wallets]
    );
    const walletNameTrimmed = walletName.trim();
    const isDuplicateName =
        walletNameTrimmed.length > 0 &&
        existingNamesLower.has(walletNameTrimmed.toLowerCase());

    const walletList = useMemo(() => Object.values(wallets), [wallets]);

    const handleCreateWallet = () => {
        const id = `wallet_${Date.now()}`;
        const name = walletNameTrimmed || "New Wallet";
        if (existingNamesLower.has(name.toLowerCase())) return;
        dispatch(
            addWallet({
                id,
                name,
                description: walletDescription || undefined,
                cash: [{ value: 0, currency: settings.balanceCurrency }],
                txIds: [],
            })
        );
        setWalletName("");
        setWalletDescription("");
        setAddOpen(false);
    };

    return (
        <div className="pb-20">
            <PageHeader
                title="Wallets"
                onMenuClick={onMenuClick}
            />

            <main className="p-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {walletList.map((wallet) => (
                        <WalletCard
                            key={wallet.id}
                            walletId={wallet.id}
                            name={wallet.name}
                            balance={sumCash(wallet.cash)}
                            pnl={0}
                            type={wallet.description}
                        />
                    ))}
                    <AddWalletCard onClick={() => setAddOpen(true)} />
                </div>
            </main>

            <Modal
                isOpen={isAddOpen}
                onClose={() => setAddOpen(false)}
                title="Add New Wallet"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Platform Name
                        </label>
                        <input
                            type="text"
                            value={walletName}
                            onChange={(event) =>
                                setWalletName(event.target.value)
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                        {isDuplicateName && (
                            <p className="mt-2 text-sm text-app-warning">
                                A wallet with this name already exists.
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Description
                        </label>
                        <input
                            type="text"
                            value={walletDescription}
                            onChange={(event) =>
                                setWalletDescription(event.target.value)
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                    </div>
                    <Button
                        className="w-full"
                        onClick={handleCreateWallet}
                        disabled={!walletNameTrimmed || isDuplicateName}
                    >
                        Create Wallet
                    </Button>
                </div>
            </Modal>
        </div>
    );
};
