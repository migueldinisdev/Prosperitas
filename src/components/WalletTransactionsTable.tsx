import React from "react";
import { WalletTx, AssetsState, Money } from "../core/schema-types";
import { formatCurrency } from "../utils/formatters";

interface WalletTransactionsTableProps {
    transactions: WalletTx[];
    assets: AssetsState;
}

const formatMoney = (money?: Money) =>
    money ? formatCurrency(money.value, money.currency) : "-";

const formatType = (type: WalletTx["type"]) =>
    type.charAt(0).toUpperCase() + type.slice(1);

export const WalletTransactionsTable: React.FC<WalletTransactionsTableProps> = ({
    transactions,
    assets,
}) => {
    if (transactions.length === 0) {
        return (
            <div className="text-sm text-app-muted">
                No wallet transactions yet.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-app-muted uppercase border-b border-app-border">
                    <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Asset</th>
                        <th className="px-4 py-3 font-medium text-right">
                            Quantity
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                            Price
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                            Amount
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                            Fees/Tax
                        </th>
                        <th className="px-4 py-3 font-medium text-right">FX</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                    {transactions.map((tx) => {
                        const asset =
                            "assetId" in tx && tx.assetId
                                ? assets[tx.assetId]
                                : undefined;
                        const assetLabel = asset
                            ? `${asset.ticker} • ${asset.name}`
                            : "-";

                        let quantity: string | number = "-";
                        let price = "-";
                        let amount = "-";
                        let fees = "-";
                        let fx = "-";

                        if (tx.type === "deposit" || tx.type === "withdraw") {
                            amount = formatMoney(tx.amount);
                        }

                        if (tx.type === "dividend") {
                            amount = formatMoney(tx.amount);
                            fees = formatMoney(tx.tax);
                        }

                        if (tx.type === "forex") {
                            amount = `${formatMoney(tx.from)} → ${formatMoney(
                                tx.to
                            )}`;
                            fees = formatMoney(tx.fees);
                        }

                        if (tx.type === "buy" || tx.type === "sell") {
                            quantity = tx.quantity.toLocaleString();
                            price = formatMoney(tx.price);
                            amount = formatCurrency(
                                tx.price.value * tx.quantity,
                                tx.price.currency
                            );
                            fees = [
                                tx.fees ? formatMoney(tx.fees) : null,
                                tx.tax ? formatMoney(tx.tax) : null,
                            ]
                                .filter(Boolean)
                                .join(" / ") || "-";
                            fx =
                                tx.fxPair && tx.fxRate
                                    ? `${tx.fxPair} @ ${tx.fxRate}`
                                    : "-";
                        }

                        return (
                            <tr
                                key={tx.id}
                                className="group hover:bg-app-surface transition-colors"
                            >
                                <td className="px-4 py-3 text-app-muted">
                                    {tx.date}
                                </td>
                                <td className="px-4 py-3 text-app-foreground font-medium">
                                    {formatType(tx.type)}
                                </td>
                                <td className="px-4 py-3 text-app-muted">
                                    {assetLabel}
                                </td>
                                <td className="px-4 py-3 text-right text-app-muted">
                                    {quantity}
                                </td>
                                <td className="px-4 py-3 text-right text-app-muted">
                                    {price}
                                </td>
                                <td className="px-4 py-3 text-right text-app-foreground font-medium">
                                    {amount}
                                </td>
                                <td className="px-4 py-3 text-right text-app-muted">
                                    {fees}
                                </td>
                                <td className="px-4 py-3 text-right text-app-muted">
                                    {fx}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
