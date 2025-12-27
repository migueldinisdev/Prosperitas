export const getMonthKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
};

export const parseMonthKey = (monthKey: string) => {
    const [year, month] = monthKey.split("-").map(Number);
    return new Date(year, (month ?? 1) - 1, 1);
};

export const addMonths = (monthKey: string, delta: number) => {
    const date = parseMonthKey(monthKey);
    date.setMonth(date.getMonth() + delta);
    return getMonthKey(date);
};

export const formatMonthLabel = (monthKey: string, locale?: string) => {
    const date = parseMonthKey(monthKey);
    return date.toLocaleString(locale ?? undefined, {
        month: "long",
        year: "numeric",
    });
};

export const getMonthDateInputValue = (monthKey: string, referenceDate = new Date()) => {
    const baseDate = parseMonthKey(monthKey);
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const day = Math.min(referenceDate.getDate(), daysInMonth);
    const date = new Date(year, month, day);
    return date.toISOString().slice(0, 10);
};
