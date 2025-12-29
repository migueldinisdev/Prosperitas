import { replaceState, store } from "./index";
import { defaultState } from "./initialState";
import { ProsperitasState } from "../core/schema-types";

export const hydrateStoreFromJson = (json: string): void => {
    try {
        const parsed = JSON.parse(json) as ProsperitasState;
        store.dispatch(replaceState(parsed));
    } catch (error) {
        console.warn("Failed to hydrate store from JSON, falling back to defaults", error);
        store.dispatch(replaceState(defaultState));
    }
};
