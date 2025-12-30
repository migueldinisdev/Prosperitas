import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { store } from "./index";

export type SyncMode = "offline" | "cloud" | null;
export type SyncStatus = "saved" | "unsaved" | "saving" | "up-to-date";

interface SyncStatusContextValue {
    mode: SyncMode;
    status: SyncStatus;
    isDirty: boolean;
    setMode: (mode: SyncMode) => void;
    setModeAndClean: (mode: SyncMode) => void;
    markSaving: () => void;
    markUnsaved: () => void;
    markSaved: (status?: SyncStatus) => void;
    suppressNextDirty: () => void;
    resetSession: () => void;
}

const SyncStatusContext = createContext<SyncStatusContextValue | undefined>(
    undefined
);

const getSavedStatus = (mode: SyncMode): SyncStatus =>
    mode === "cloud" ? "up-to-date" : "saved";

const getStoredMode = (): SyncMode => {
    if (typeof window === "undefined") {
        return null;
    }

    const stored = window.localStorage.getItem("prosperitas:syncMode");
    return stored === "offline" || stored === "cloud" ? stored : null;
};

const storeMode = (mode: SyncMode) => {
    if (typeof window === "undefined") {
        return;
    }

    if (mode) {
        window.localStorage.setItem("prosperitas:syncMode", mode);
    } else {
        window.localStorage.removeItem("prosperitas:syncMode");
    }
};

export const SyncStatusProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [mode, setModeState] = useState<SyncMode>(() => getStoredMode());
    const [status, setStatus] = useState<SyncStatus>(() =>
        getSavedStatus(getStoredMode())
    );
    const [isDirty, setIsDirty] = useState(false);
    const suppressDirtyRef = useRef(true);
    const previousStateRef = useRef(store.getState());
    const modeRef = useRef<SyncMode>(mode);

    useEffect(() => {
        modeRef.current = mode;
        setStatus(getSavedStatus(mode));
        setIsDirty(false);
    }, [mode]);

    useEffect(() => {
        const unsubscribe = store.subscribe(() => {
            const nextState = store.getState();
            if (nextState !== previousStateRef.current) {
                if (!suppressDirtyRef.current && modeRef.current !== null) {
                    setIsDirty(true);
                    setStatus((current) =>
                        current === "saving" ? current : "unsaved"
                    );
                }
                suppressDirtyRef.current = false;
                previousStateRef.current = nextState;
            }
        });

        return unsubscribe;
    }, []);

    const setMode = (nextMode: SyncMode) => {
        storeMode(nextMode);
        setModeState(nextMode);
    };

    const setModeAndClean = (nextMode: SyncMode) => {
        storeMode(nextMode);
        setModeState(nextMode);
        setIsDirty(false);
        setStatus(getSavedStatus(nextMode));
    };

    const markSaving = () => {
        setStatus("saving");
    };

    const markUnsaved = () => {
        setIsDirty(true);
        setStatus("unsaved");
    };

    const markSaved = (nextStatus?: SyncStatus) => {
        setIsDirty(false);
        setStatus(nextStatus ?? getSavedStatus(mode));
    };

    const suppressNextDirty = () => {
        suppressDirtyRef.current = true;
    };

    const resetSession = () => {
        suppressNextDirty();
        storeMode(null);
        setModeState(null);
        setIsDirty(false);
        setStatus("saved");
    };

    const value = useMemo(
        () => ({
            mode,
            status,
            isDirty,
            setMode,
            setModeAndClean,
            markSaving,
            markUnsaved,
            markSaved,
            suppressNextDirty,
            resetSession,
        }),
        [mode, status, isDirty]
    );

    return (
        <SyncStatusContext.Provider value={value}>
            {children}
        </SyncStatusContext.Provider>
    );
};

export const useSyncStatus = (): SyncStatusContextValue => {
    const context = useContext(SyncStatusContext);
    if (!context) {
        throw new Error("useSyncStatus must be used within SyncStatusProvider");
    }
    return context;
};
