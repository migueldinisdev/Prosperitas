import React from "react";
import { Card } from "../../ui/Card";
import { Plus } from "lucide-react";

interface AddPieCardProps {
    onClick: () => void;
}

export const AddPieCard: React.FC<AddPieCardProps> = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="w-full h-full text-left"
            aria-label="Add new pie"
        >
            <Card className="hover:bg-app-surface transition-colors group h-full flex flex-col items-center justify-center min-h-[200px]">
                <div className="w-12 h-12 rounded-xl bg-app-surface flex items-center justify-center group-hover:scale-105 transition-transform mb-4">
                    <Plus size={24} className="text-app-muted" />
                </div>

                <h3 className="text-app-muted text-sm font-medium">
                    Add Pie
                </h3>
            </Card>
        </button>
    );
};
