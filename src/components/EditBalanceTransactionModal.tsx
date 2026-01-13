import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
    addBalanceTransactionThunk,
    removeBalanceTransactionThunk,
    updateBalanceTransactionThunk,
} from "../store/thunks/balanceThunks";
import { useBalanceData } from "../hooks/useBalanceData";
import { getMonthDateInputValue, getMonthKey } from "../utils/dates";
import type { BalanceTransaction, CategoryType } from "../core/schema-types";
import { selectSettings } from "../store/selectors";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    monthKey: string;
    transaction: BalanceTransaction | null;
    index: number | null;
}

const TRANSACTION_TYPES: CategoryType[] = ["expense", "income"];

export const EditBalanceTransactionModal: React.FC<Props> = ({
    isOpen,
    onClose,
    monthKey,
    transaction,
    index,
}) => {
    const dispatch = useAppDispatch();
    const { categories } = useBalanceData(monthKey);
    const { balanceCurrency } = useAppSelector(selectSettings);
    const [type, setType] = useState<CategoryType>("expense");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [date, setDate] = useState(() => getMonthDateInputValue(monthKey));

    useEffect(() => {
        if (!transaction) return;
        setType(transaction.type);
        setAmount(transaction.amount.value.toString());
        setDescription(transaction.description ?? "");
        setCategoryId(transaction.categoryId ?? "");
        setDate(transaction.date || getMonthDateInputValue(monthKey));
    }, [monthKey, transaction]);

    useEffect(() => {
        if (!isOpen) return;
        if (!transaction) {
            setType("expense");
            setAmount("");
            setDescription("");
            setCategoryId("");
            setDate(getMonthDateInputValue(monthKey));
        }
    }, [isOpen, monthKey, transaction]);

    const categoryOptions = useMemo(
        () =>
            Object.values(categories).filter(
                (category) => category.type === type
            ),
        [categories, type]
    );

    useEffect(() => {
        if (
            categoryId &&
            !categoryOptions.some((category) => category.id === categoryId)
        ) {
            setCategoryId("");
        }
    }, [categoryId, categoryOptions]);

    const handleSave = () => {
        if (!transaction || index === null) return;
        const parsedAmount = Number(amount);
        if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
            return;
        }
        const monthFromDate = (() => {
            if (!date) {
                return monthKey;
            }
            const [year, month, day] = date.split("-").map(Number);
            if (!year || !month || !day) {
                return monthKey;
            }
            return getMonthKey(new Date(year, month - 1, day));
        })();

        const updatedTransaction: BalanceTransaction = {
            date,
            type,
            categoryId: categoryId ? categoryId : null,
            amount: {
                value: parsedAmount,
                currency: transaction.amount.currency ?? balanceCurrency,
            },
            description: description.trim() ? description.trim() : undefined,
            createdAt: transaction.createdAt,
        };

        if (monthFromDate !== monthKey) {
            dispatch(
                removeBalanceTransactionThunk({
                    month: monthKey,
                    index,
                })
            );
            dispatch(
                addBalanceTransactionThunk({
                    month: monthFromDate,
                    transaction: updatedTransaction,
                })
            );
        } else {
            dispatch(
                updateBalanceTransactionThunk({
                    month: monthKey,
                    index,
                    transaction: updatedTransaction,
                })
            );
        }

        onClose();
    };

    const isSaveDisabled =
        Number.isNaN(Number(amount)) || Number(amount) <= 0 || !date;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Transaction">
            <div className="space-y-4">
                <div className="flex bg-app-surface p-1 rounded-lg">
                    {TRANSACTION_TYPES.map((entry) => (
                        <button
                            key={entry}
                            onClick={() => setType(entry)}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${
                                type === entry
                                    ? "bg-app-primary text-white shadow-sm"
                                    : "text-app-muted hover:text-app-foreground"
                            }`}
                        >
                            {entry}
                        </button>
                    ))}
                </div>

                <div>
                    <label className="block text-xs font-medium text-app-muted mb-1">
                        Amount
                    </label>
                    <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        placeholder="0.00"
                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-app-muted mb-1">
                        Category
                    </label>
                    <select
                        value={categoryId}
                        onChange={(event) => setCategoryId(event.target.value)}
                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                    >
                        <option value="">No category</option>
                        {categoryOptions.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-app-muted mb-1">
                        Date
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-app-muted mb-1">
                        Description
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Optional note"
                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                    />
                </div>

                <div className="pt-2">
                    <Button
                        className="w-full"
                        onClick={handleSave}
                        disabled={isSaveDisabled}
                    >
                        Save Changes
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
