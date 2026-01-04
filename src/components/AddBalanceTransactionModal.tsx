import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useAppDispatch } from "../store/hooks";
import { addBalanceTransactionThunk } from "../store/thunks/balanceThunks";
import { useBalanceData } from "../hooks/useBalanceData";
import { getMonthDateInputValue, getMonthKey } from "../utils/dates";
import type { CategoryType } from "../core/schema-types";
import { useAppSelector } from "../store/hooks";
import { selectSettings } from "../store/selectors";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    monthKey?: string;
}

const TRANSACTION_TYPES: CategoryType[] = ["expense", "income"];

export const AddBalanceTransactionModal: React.FC<Props> = ({
    isOpen,
    onClose,
    monthKey,
}) => {
    const dispatch = useAppDispatch();
    const effectiveMonth = monthKey ?? getMonthKey(new Date());
    const { categories } = useBalanceData(effectiveMonth);
    const { balanceCurrency } = useAppSelector(selectSettings);
    const [type, setType] = useState<CategoryType>("expense");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [date, setDate] = useState(() =>
        getMonthDateInputValue(effectiveMonth)
    );

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

    useEffect(() => {
        setDate(getMonthDateInputValue(effectiveMonth));
    }, [effectiveMonth, isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setAmount("");
            setDescription("");
            setType("expense");
            setCategoryId("");
        }
    }, [isOpen]);

    const handleSave = () => {
        const parsedAmount = Number(amount);
        if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
            return;
        }
        const monthFromDate = (() => {
            if (!date) {
                return effectiveMonth;
            }
            const [year, month, day] = date.split("-").map(Number);
            if (!year || !month || !day) {
                return effectiveMonth;
            }
            return getMonthKey(new Date(year, month - 1, day));
        })();

        dispatch(
            addBalanceTransactionThunk({
                month: monthFromDate,
                transaction: {
                    date,
                    type,
                    categoryId: categoryId ? categoryId : null,
                    amount: {
                        value: parsedAmount,
                        currency: balanceCurrency,
                    },
                    description: description.trim() ? description.trim() : undefined,
                    createdAt: new Date().toISOString(),
                },
            })
        );

        setAmount("");
        setDescription("");
        onClose();
    };

    const isSaveDisabled = Number.isNaN(Number(amount)) || Number(amount) <= 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Transaction">
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
                    <Button className="w-full" onClick={handleSave} disabled={isSaveDisabled}>
                        Save Transaction
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
