import React, { useEffect, useMemo, useState } from "react";
import {
    fetchStooqStockSearch,
    StooqStockSearchResult,
} from "../data/api/prices/stooqStockSearchApi";

interface CombinedProps {
    value: string;
    onChange: (value: string) => void;
}

interface SeparateProps {
    searchValue: string;
    onSearchChange: (value: string) => void;
    selectedValue: string;
    onSelect: (value: string) => void;
}

type Props = (CombinedProps | SeparateProps) & {
    placeholder?: string;
    disabled?: boolean;
};

const formatOptionLabel = (option: StooqStockSearchResult) => {
    const parts = [option.symbol, option.name].filter((part) => part.length > 0);
    return parts.join(" · ");
};

export const StooqAPIStockSelect: React.FC<Props> = (props) => {
    const searchValue = "searchValue" in props ? props.searchValue : props.value;
    const selectedValue =
        "selectedValue" in props ? props.selectedValue : searchValue;
    const placeholder = props.placeholder;
    const disabled = props.disabled ?? false;
    const [options, setOptions] = useState<StooqStockSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const trimmedValue = searchValue.trim();
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
    }, [searchValue]);

    const selectOptions = useMemo(
        () =>
            options.filter(
                (option, index, array) =>
                    array.findIndex((entry) => entry.symbol === option.symbol) ===
                    index
            ),
        [options]
    );

    const hasQuery = searchValue.trim().length > 0;
    const shouldShowDropdown =
        isOpen && !disabled && (hasQuery || isLoading || errorMessage);

    const applySelection = (nextValue: string) => {
        if ("onSelect" in props) {
            props.onSelect(nextValue);
            if ("onSearchChange" in props) {
                props.onSearchChange(nextValue);
            }
        } else {
            props.onChange(nextValue);
        }
        setIsOpen(false);
    };

    return (
        <div className="relative w-full">
            <input
                className="w-full rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm disabled:opacity-60"
                value={searchValue}
                placeholder={placeholder}
                disabled={disabled}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setIsOpen(false)}
                onChange={(event) => {
                    const nextValue = event.target.value;
                    if ("onSearchChange" in props) {
                        props.onSearchChange(nextValue);
                    } else {
                        props.onChange(nextValue);
                    }
                }}
            />
            {shouldShowDropdown && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-app-border bg-app-card shadow-lg">
                    {isLoading ? (
                        <div className="px-3 py-2 text-xs text-app-text/70">
                            Searching...
                        </div>
                    ) : errorMessage ? (
                        <div className="px-3 py-2 text-xs text-app-danger">
                            {errorMessage}
                        </div>
                    ) : selectOptions.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-app-text/70">
                            No matches
                        </div>
                    ) : (
                        <ul className="max-h-60 overflow-auto py-1 text-sm">
                            {selectOptions.map((option) => {
                                const label = formatOptionLabel(option);
                                const price =
                                    option.price === null
                                        ? ""
                                        : option.price.toString();
                                const isSelected =
                                    option.symbol === selectedValue;
                                return (
                                    <li key={option.symbol}>
                                        <button
                                            type="button"
                                            className={`w-full px-3 py-2 text-left hover:bg-app-surface ${
                                                isSelected
                                                    ? "bg-app-surface"
                                                    : ""
                                            }`}
                                            onMouseDown={(event) =>
                                                event.preventDefault()
                                            }
                                            onClick={() =>
                                                applySelection(option.symbol)
                                            }
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="truncate">
                                                    {label}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {price && (
                                                        <span className="text-xs text-app-text/70">
                                                            {price}
                                                        </span>
                                                    )}
                                                    {isSelected && (
                                                        <span className="text-xs text-app-text/60">
                                                            Selected
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
            {errorMessage && !shouldShowDropdown && (
                <p className="mt-1 text-xs text-app-danger">
                    {errorMessage}
                </p>
            )}
        </div>
    );
};
