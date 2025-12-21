import React from "react";
import {
    ArrowUpRight,
    ArrowDownRight,
    Coffee,
    ShoppingBag,
    Home,
    RefreshCw,
} from "lucide-react";
import { Card } from "../../ui/Card";

const transactions = [
    {
        id: 1,
        title: "Whole Foods Market",
        cat: "Groceries",
        amount: -142.5,
        date: "Oct 24",
        type: "expense",
        icon: ShoppingBag,
    },
    {
        id: 2,
        title: "Monthly Salary",
        cat: "Income",
        amount: 4200.0,
        date: "Oct 23",
        type: "income",
        icon: ArrowUpRight,
    },
    {
        id: 3,
        title: "Transfer to Trading212",
        cat: "Investment",
        amount: -500.0,
        date: "Oct 22",
        type: "transfer",
        icon: RefreshCw,
    },
    {
        id: 4,
        title: "Starbucks",
        cat: "Food & Drink",
        amount: -6.5,
        date: "Oct 21",
        type: "expense",
        icon: Coffee,
    },
    {
        id: 5,
        title: "Rent Payment",
        cat: "Housing",
        amount: -1800.0,
        date: "Oct 01",
        type: "expense",
        icon: Home,
    },
    {
        id: 6,
        title: "Amazon Purchase",
        cat: "Shopping",
        amount: -89.99,
        date: "Oct 20",
        type: "expense",
        icon: ShoppingBag,
    },
    {
        id: 7,
        title: "Freelance Work",
        cat: "Income",
        amount: 850.0,
        date: "Oct 18",
        type: "income",
        icon: ArrowUpRight,
    },
    {
        id: 8,
        title: "Gym Membership",
        cat: "Health",
        amount: -45.0,
        date: "Oct 15",
        type: "expense",
        icon: Coffee,
    },
    {
        id: 9,
        title: "Restaurant Dinner",
        cat: "Food & Drink",
        amount: -67.5,
        date: "Oct 14",
        type: "expense",
        icon: Coffee,
    },
    {
        id: 10,
        title: "Gas Station",
        cat: "Transport",
        amount: -52.0,
        date: "Oct 12",
        type: "expense",
        icon: ShoppingBag,
    },
];

export const MonthlyBalanceTransactionsList: React.FC = () => {
    return (
        <Card
            title="Transactions"
            action={
                <button className="text-sm text-app-muted hover:text-app-foreground transition-colors">
                    View all
                </button>
            }
        >
            <div className="-mx-5 -mb-5 overflow-hidden rounded-b-2xl">
                <div className="max-h-[500px] overflow-y-auto">
                    {transactions.map((t, i) => {
                        const isLast = i === transactions.length - 1;
                        return (
                            <div
                                key={t.id}
                                className={`flex items-center justify-between px-5 transition-colors cursor-pointer ${
                                    isLast
                                        ? "py-4 pb-5"
                                        : "py-4 border-b border-app-border"
                                } hover:bg-app-surface`}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                            t.type === "income"
                                                ? "bg-emerald-500/10 text-emerald-500"
                                                : t.type === "transfer"
                                                ? "bg-blue-500/10 text-blue-500"
                                                : "bg-app-surface text-app-muted"
                                        }`}
                                    >
                                        <t.icon size={18} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-app-foreground">
                                            {t.title}
                                        </p>
                                        <p className="text-xs text-app-muted">
                                            {t.cat} • {t.date}
                                        </p>
                                    </div>
                                </div>
                                <span
                                    className={`font-semibold ${
                                        t.amount > 0
                                            ? "text-app-success"
                                            : "text-app-foreground"
                                    }`}
                                >
                                    {t.amount > 0 ? "+" : ""}
                                    {t.amount.toFixed(2)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
};
