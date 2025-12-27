import React, { useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { HomeSummarySection } from "./HomeSummarySection";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { Plus } from "lucide-react";
import { AddBalanceTransactionModal } from "../../components/AddBalanceTransactionModal";
import { StateSnapshotCard } from "../../components/StateSnapshotCard";
import { getMonthKey } from "../../utils/dates";

interface Props {
    onMenuClick: () => void;
}

export const HomePage: React.FC<Props> = ({ onMenuClick }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="pb-20">
            <PageHeader
                title="Home"
                subtitle="Your financial overview"
                onMenuClick={onMenuClick}
            />

            <main className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
                <Card title="Quick Actions">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                            variant="primary"
                            className="w-full"
                            onClick={() => setIsModalOpen(true)}
                            icon={<Plus size={16} />}
                        >
                            Add Transaction
                        </Button>
                    </div>
                </Card>
                <StateSnapshotCard />

                <HomeSummarySection />
            </main>

            <AddBalanceTransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                monthKey={getMonthKey(new Date())}
            />
        </div>
    );
};
