import React, { useMemo, useSyncExternalStore } from "react";
import type { Persistor } from "../store/redux-persist";

interface PersistGateProps {
    loading?: React.ReactNode;
    persistor: Persistor<unknown>;
    children: React.ReactNode;
}

export const PersistGate: React.FC<PersistGateProps> = ({
    loading = null,
    persistor,
    children,
}) => {
    const subscribe = useMemo(
        () => (listener: () => void) => persistor.subscribe(listener),
        [persistor]
    );

    const bootstrapped = useSyncExternalStore(
        subscribe,
        () => persistor.getBootstrapped(),
        () => true
    );

    return <>{bootstrapped ? children : loading}</>;
};
