export const formatCurrency = (value: number, currency: string = "USD") =>
    value.toLocaleString(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    });

// Significant digits preserve the stored number, including very small crypto
// quantities that a fixed fraction-digit limit would round to zero.
export const formatQuantity = (value: number, useGrouping = true) =>
    value.toLocaleString(useGrouping ? undefined : "en-US", {
        useGrouping,
        maximumSignificantDigits: 21,
    });
