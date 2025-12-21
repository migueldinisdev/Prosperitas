import React from "react";
import { PageHeader } from "../../components/PageHeader";
import { PieCard } from "./PieCard";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { Plus } from "lucide-react";

interface Props {
    onMenuClick: () => void;
}

export const PiesPage: React.FC<Props> = ({ onMenuClick }) => {
    return (
        <div className="pb-20">
            <PageHeader
                title="Pies"
                subtitle="Automated investment strategies"
                onMenuClick={onMenuClick}
            />

            <main className="p-6 max-w-7xl mx-auto space-y-6">
                <Card title="Quick Actions">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                            variant="primary"
                            className="w-full"
                            icon={<Plus size={16} />}
                        >
                            Create Pie
                        </Button>
                    </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <PieCard
                        name="Tech Growth"
                        desc="High risk, high reward technology sector focus."
                        risk={5}
                        value={12400}
                        growth={12.5}
                    />
                    <PieCard
                        name="Dividend Kings"
                        desc="Stable income from established companies."
                        risk={2}
                        value={8500}
                        growth={4.2}
                    />
                    <PieCard
                        name="Green Energy"
                        desc="Renewable energy and EV exposure."
                        risk={4}
                        value={5200}
                        growth={-2.1}
                    />
                </div>
            </main>
        </div>
    );
};
