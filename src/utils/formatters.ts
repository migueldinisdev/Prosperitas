export const formatCurrency = (value: number, currency: string = "USD") =>
    value.toLocaleString(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    });
