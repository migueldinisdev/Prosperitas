import { RootState } from "./index";

export const exportSaveJson = (state: RootState): string => {
    return JSON.stringify(state);
};
