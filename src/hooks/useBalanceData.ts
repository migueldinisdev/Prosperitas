import { useMemo } from "react";
import { useAppSelector } from "../store/hooks";
import {
    makeSelectBalanceByMonth,
    selectBalance,
    selectCategories,
} from "../store/selectors";

export const useBalanceData = (month?: string) => {
    const categories = useAppSelector(selectCategories);
    const balance = useAppSelector(selectBalance);
    const monthSelector = useMemo(
        () => (month ? makeSelectBalanceByMonth(month) : null),
        [month]
    );
    const monthData = useAppSelector((state) =>
        monthSelector ? monthSelector(state) : undefined
    );

    return useMemo(
        () => ({
            categories,
            balance,
            monthData,
        }),
        [balance, categories, monthData]
    );
};
