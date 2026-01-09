import React, { useEffect, useMemo, useState } from "react";
import {
    fetchStooqStockSearch,
    StooqStockSearchResult,
} from "../data/api/prices/stooqStockSearchApi";

interface Props {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const formatOptionLabel = (option: StooqStockSearchResult) => {
    const parts = [
        option.symbol,
        option.name,
        option.exchange,
        option.price === null ? "" : option.price.toString(),
    ].filter((part) => part.length > 0);
    return parts.join(" · ");
};

export const StooqAPIStockSelect: React.FC<Props> = ({
    value,
    onChange,
    placeholder,
}) => {
    const [options, setOptions] = useState<StooqStockSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const trimmedValue = value.trim();
        if (!trimmedValue) {
            setOptions([]);
            setErrorMessage(null);
            return;
        }

        const controller = new AbortController();
        setIsLoading(true);
        setErrorMessage(null);
        fetchStooqStockSearch(trimmedValue, controller.signal)
            .then((results) => {
                setOptions(results);
            })
            .catch((error) => {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }
                setOptions([]);
                setErrorMessage(
                    error instanceof Error ? error.message : "Lookup failed."
                );
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            });

        return () => controller.abort();
    }, [value]);

    const selectOptions = useMemo(
        () =>
            options.filter(
                (option, index, array) =>
                    array.findIndex((entry) => entry.symbol === option.symbol) ===
                    index
            ),
        [options]
    );

    return (
        <div className="flex flex-wrap gap-2">
            <input
                className="min-w-[140px] flex-1 rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm"
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
            />
            <select
                className="min-w-[200px] flex-1 rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm"
                value=""
                onChange={(event) => {
                    if (event.target.value) {
                        onChange(event.target.value);
                    }
                }}
            >
                <option value="" disabled>
                    {isLoading
                        ? "Searching..."
                        : selectOptions.length > 0
                          ? "Select ticker"
                          : "No matches"}
                </option>
                {selectOptions.map((option) => (
                    <option key={option.symbol} value={option.symbol}>
                        {formatOptionLabel(option)}
                    </option>
                ))}
            </select>
            {errorMessage && (
                <p className="w-full text-xs text-app-danger">
                    {errorMessage}
                </p>
            )}
        </div>
    );
};
