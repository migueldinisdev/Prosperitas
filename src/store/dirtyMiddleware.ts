import { Middleware } from "@reduxjs/toolkit";
import { replaceState } from "./actions";
import { REHYDRATE_ACTION } from "./persist";

/**
 * Middleware to automatically mark state as dirty when user makes changes.
 * This tracks all Redux actions that modify persisted state.
 */

// Actions that should NOT trigger dirty flag
const IGNORED_ACTION_TYPES = new Set([
    "app/replaceState",           // When loading from file/drive
    "persist/REHYDRATE",          // Redux persist rehydration
    "persist/PERSIST",            // Redux persist saving
    "notifications/addNotification", // Notifications are ephemeral
    "notifications/removeNotification",
    "notifications/clearNotifications",
]);

// Store reference to sync status callbacks
let markUnsavedCallback: (() => void) | null = null;
let suppressDirtyRef: { current: boolean } = { current: false };
let currentMode: "offline" | "cloud" | null = null;

export const registerDirtyCallbacks = (
    markUnsaved: () => void,
    suppressRef: { current: boolean },
    mode: "offline" | "cloud" | null
) => {
    markUnsavedCallback = markUnsaved;
    suppressDirtyRef = suppressRef;
    currentMode = mode;
};

export const dirtyMiddleware: Middleware = (store) => (next) => (action) => {
    const result = next(action);

    // Skip if no mode is set (not logged in)
    if (!currentMode) {
        return result;
    }

    // Check if suppress flag is set, then reset it
    if (suppressDirtyRef.current) {
        suppressDirtyRef.current = false;
        return result;
    }

    // Skip ignored actions
    if (IGNORED_ACTION_TYPES.has(action.type)) {
        return result;
    }

    // Skip replaceState action (using matcher)
    if (replaceState.match(action)) {
        return result;
    }

    // Skip REHYDRATE action
    if (action.type === REHYDRATE_ACTION) {
        return result;
    }

    // Mark as dirty for all other actions
    if (markUnsavedCallback) {
        markUnsavedCallback();
    }

    return result;
};
