import React, { useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { HomeSummarySection } from "./HomeSummarySection";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { Plus } from "lucide-react";
import { AddBalanceTransactionModal } from "../../components/AddBalanceTransactionModal";
import { StateSnapshotCard } from "../../components/StateSnapshotCard";
import { getMonthKey } from "../../utils/dates";
import { useNotifications } from "../../hooks/useNotifications";

interface Props {
    onMenuClick: () => void;
}

export const HomePage: React.FC<Props> = ({ onMenuClick }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { notify } = useNotifications();

    return (
        <div className="pb-20">
            <PageHeader
                title="Home"
                onMenuClick={onMenuClick}
            />

            <main className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
                <Card title="Quick Actions">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <Button
                            variant="primary"
                            className="w-full"
                            onClick={() => setIsModalOpen(true)}
                            icon={<Plus size={16} />}
                        >
                            Add Transaction
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() =>
                                notify({
                                    type: "info",
                                    title: "Info notification",
                                    message: "This is an info message.",
                                })
                            }
                        >
                            Test Info
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() =>
                                notify({
                                    type: "success",
                                    title: "Success notification",
                                    message: "Everything completed successfully.",
                                })
                            }
                        >
                            Test Success
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() =>
                                notify({
                                    type: "warning",
                                    title: "Warning notification",
                                    message: "Please double-check the details.",
                                })
                            }
                        >
                            Test Warning
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() =>
                                notify({
                                    type: "error",
                                    title: "Error notification",
                                    message: "Something went wrong.",
                                })
                            }
                        >
                            Test Error
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
