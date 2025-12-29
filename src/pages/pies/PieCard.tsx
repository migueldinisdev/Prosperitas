import React from "react";
import { Card } from "../../ui/Card";
import { Link } from "react-router-dom";
import { formatCurrency } from "../../utils/formatters";

interface PieCardProps {
    pieId: string;
    name: string;
    description?: string;
    risk?: number;
    totalValue: number;
    assetCount: number;
    currency: string;
}

export const PieCard: React.FC<PieCardProps> = ({
    pieId,
    name,
    description,
    risk,
    totalValue,
    assetCount,
    currency,
}) => {
    const riskValue = risk ?? 0;

    return (
        <Link to={`/pies/${pieId}`}>
            <Card className="hover:bg-app-surface transition-colors cursor-pointer h-full flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-app-foreground">
                            {name}
                        </h3>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className={`w-1 h-3 rounded-full ${
                                        i <= riskValue
                                            ? "bg-app-primary"
                                            : "bg-app-border"
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                    <p className="text-sm text-app-muted mb-6">
                        {description || "No description yet."}
                    </p>
                </div>

                <div className="space-y-2">
                    <div>
                        <p className="text-xs text-app-muted uppercase font-medium">
                            Total Value
                        </p>
                        <p className="text-xl font-bold text-app-foreground">
                            {formatCurrency(totalValue, currency)}
                        </p>
                    </div>
                    <div className="flex justify-between text-sm text-app-muted">
                        <span>{assetCount} assets</span>
                        <span>
                            Risk {risk !== undefined ? `${risk}/5` : "N/A"}
                        </span>
                    </div>
                </div>
            </Card>
        </Link>
    );
};
