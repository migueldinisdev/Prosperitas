import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useAppDispatch } from "../store/hooks";
import { updateWalletTransaction } from "../store/thunks/walletThunks";
import type { Currency, Money, WalletTx } from "../core/schema-types";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    transaction: WalletTx | null;
}

const currencyOptions: Currency[] = ["EUR", "USD"];

const formatNumberInput = (value?: number) =>
    typeof value === "number" ? value.toString() : "";

export const EditWalletTransactionModal: React.FC<Props> = ({
    isOpen,
    onClose,
    transaction,
}) => {
    const dispatch = useAppDispatch();
    const [date, setDate] = useState("");
    const [amountValue, setAmountValue] = useState("");
    const [amountCurrency, setAmountCurrency] = useState<Currency>("USD");
    const [quantity, setQuantity] = useState("");
    const [priceValue, setPriceValue] = useState("");
    const [priceCurrency, setPriceCurrency] = useState<Currency>("USD");
    const [feesValue, setFeesValue] = useState("");
    const [feesCurrency, setFeesCurrency] = useState<Currency>("USD");
    const [fxRate, setFxRate] = useState("");
    const [fxPair, setFxPair] = useState("");
    const [fromValue, setFromValue] = useState("");
    const [fromCurrency, setFromCurrency] = useState<Currency>("USD");
    const [toValue, setToValue] = useState("");
    const [toCurrency, setToCurrency] = useState<Currency>("EUR");

    useEffect(() => {
        if (!transaction) return;
        setDate(transaction.date);
        switch (transaction.type) {
            case "deposit":
            case "withdraw":
            case "dividend":
                setAmountValue(formatNumberInput(transaction.amount.value));
                setAmountCurrency(transaction.amount.currency);
                break;
            case "buy":
            case "sell":
                setQuantity(formatNumberInput(transaction.quantity));
                setPriceValue(formatNumberInput(transaction.price.value));
                setPriceCurrency(transaction.price.currency);
                setFeesValue(formatNumberInput(transaction.fees?.value));
                setFeesCurrency(transaction.fees?.currency ?? transaction.price.currency);
                setFxRate(formatNumberInput(transaction.fxRate));
                setFxPair(transaction.fxPair ?? "");
                break;
            case "forex":
                setFromValue(formatNumberInput(transaction.from.value));
                setFromCurrency(transaction.from.currency);
                setToValue(formatNumberInput(transaction.to.value));
                setToCurrency(transaction.to.currency);
                setFeesValue(formatNumberInput(transaction.fees?.value));
                setFeesCurrency(transaction.fees?.currency ?? transaction.from.currency);
                setFxRate(formatNumberInput(transaction.fxRate));
                break;
        }
    }, [transaction]);

    const hasRequiredValues = useMemo(() => {
        if (!transaction) return false;
        const amountNumber = Number(amountValue);
        const quantityNumber = Number(quantity);
        const priceNumber = Number(priceValue);
        const fromNumber = Number(fromValue);
        const toNumber = Number(toValue);
        switch (transaction.type) {
            case "deposit":
            case "withdraw":
            case "dividend":
                return amountNumber > 0;
            case "buy":
            case "sell":
                return quantityNumber > 0 && priceNumber > 0;
            case "forex":
                return fromNumber > 0 && toNumber > 0;
        }
    }, [amountValue, fromValue, priceValue, quantity, toValue, transaction]);

    const getOptionalMoney = (value: string, currency: Currency): Money | undefined => {
        const parsed = Number(value);
        if (Number.isNaN(parsed) || parsed <= 0) return undefined;
        return { value: parsed, currency };
    };

    const handleSave = () => {
        if (!transaction || !hasRequiredValues) return;
        const updated: WalletTx = (() => {
            switch (transaction.type) {
                case "deposit":
                case "withdraw":
                case "dividend":
                    return {
                        ...transaction,
                        date,
                        amount: {
                            value: Number(amountValue),
                            currency: amountCurrency,
                        },
                    };
                case "buy":
                case "sell":
                    return {
                        ...transaction,
                        date,
                        quantity: Number(quantity),
                        price: {
                            value: Number(priceValue),
                            currency: priceCurrency,
                        },
                        fees: getOptionalMoney(feesValue, feesCurrency),
                        fxPair: fxPair.trim() ? fxPair.trim() : undefined,
                        fxRate: Number(fxRate) > 0 ? Number(fxRate) : undefined,
                    };
                case "forex":
                    return {
                        ...transaction,
                        date,
                        from: {
                            value: Number(fromValue),
                            currency: fromCurrency,
                        },
                        to: {
                            value: Number(toValue),
                            currency: toCurrency,
                        },
                        fees: getOptionalMoney(feesValue, feesCurrency),
                        fxRate: Number(fxRate) > 0 ? Number(fxRate) : undefined,
                    };
            }
        })();

        dispatch(updateWalletTransaction(updated));
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Transaction">
            {!transaction ? null : (
                <div className="space-y-4">
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

                    {transaction.type === "deposit" ||
                    transaction.type === "withdraw" ||
                    transaction.type === "dividend" ? (
                        <div className="space-y-3">
                            {transaction.type === "dividend" && transaction.assetId ? (
                                <p className="text-xs text-app-muted">
                                    Asset is locked for dividend edits.
                                </p>
                            ) : null}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        Amount
                                    </label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        value={amountValue}
                                        onChange={(event) =>
                                            setAmountValue(event.target.value)
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        Currency
                                    </label>
                                    <select
                                        value={amountCurrency}
                                        onChange={(event) =>
                                            setAmountCurrency(
                                                event.target
                                                    .value as Currency
                                            )
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    >
                                        {currencyOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {transaction.type === "buy" || transaction.type === "sell" ? (
                        <div className="space-y-3">
                            <p className="text-xs text-app-muted">
                                Asset is locked for trade edits.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        Quantity
                                    </label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.0001"
                                        value={quantity}
                                        onChange={(event) =>
                                            setQuantity(event.target.value)
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        Price
                                    </label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.0001"
                                        value={priceValue}
                                        onChange={(event) =>
                                            setPriceValue(event.target.value)
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        Price Currency
                                    </label>
                                    <select
                                        value={priceCurrency}
                                        onChange={(event) =>
                                            setPriceCurrency(
                                                event.target
                                                    .value as Currency
                                            )
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    >
                                        {currencyOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        Fees (optional)
                                    </label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        value={feesValue}
                                        onChange={(event) =>
                                            setFeesValue(event.target.value)
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        Fees Currency
                                    </label>
                                    <select
                                        value={feesCurrency}
                                        onChange={(event) =>
                                            setFeesCurrency(
                                                event.target
                                                    .value as Currency
                                            )
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    >
                                        {currencyOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        FX Pair (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={fxPair}
                                        onChange={(event) =>
                                            setFxPair(event.target.value)
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        FX Rate (optional)
                                    </label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.0001"
                                        value={fxRate}
                                        onChange={(event) =>
                                            setFxRate(event.target.value)
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {transaction.type === "forex" ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        From Amount
                                    </label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        value={fromValue}
                                        onChange={(event) =>
                                            setFromValue(event.target.value)
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        From Currency
                                    </label>
                                    <select
                                        value={fromCurrency}
                                        onChange={(event) =>
                                            setFromCurrency(
                                                event.target
                                                    .value as Currency
                                            )
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    >
                                        {currencyOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        To Amount
                                    </label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        value={toValue}
                                        onChange={(event) =>
                                            setToValue(event.target.value)
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        To Currency
                                    </label>
                                    <select
                                        value={toCurrency}
                                        onChange={(event) =>
                                            setToCurrency(
                                                event.target
                                                    .value as Currency
                                            )
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    >
                                        {currencyOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        Fees (optional)
                                    </label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        value={feesValue}
                                        onChange={(event) =>
                                            setFeesValue(event.target.value)
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        Fees Currency
                                    </label>
                                    <select
                                        value={feesCurrency}
                                        onChange={(event) =>
                                            setFeesCurrency(
                                                event.target
                                                    .value as Currency
                                            )
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    >
                                        {currencyOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        FX Rate (optional)
                                    </label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.0001"
                                        value={fxRate}
                                        onChange={(event) =>
                                            setFxRate(event.target.value)
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <div className="pt-2">
                        <Button
                            className="w-full"
                            onClick={handleSave}
                            disabled={!hasRequiredValues || !date}
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
