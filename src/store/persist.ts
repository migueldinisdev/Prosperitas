import type { Reducer, Store } from "@reduxjs/toolkit";
import { replaceState } from "./actions";

export interface StorageEngine {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
}

export interface PersistConfig<S> {
    key: string;
    storage: StorageEngine;
    version?: number;
    whitelist?: (keyof S)[];
}

export const REHYDRATE_ACTION = "persist/REHYDRATE";

const openIndexedDb = (dbName: string) =>
    new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("state")) {
                db.createObjectStore("state");
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

const runIndexedDbOperation = <T>(
    dbName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
) =>
    openIndexedDb(dbName).then(
        (db) =>
            new Promise<T>((resolve, reject) => {
                const tx = db.transaction("state", mode);
                const store = tx.objectStore("state");
                const request = operation(store);
                request.onsuccess = () => resolve(request.result as T);
                request.onerror = () => reject(request.error);
            })
    );

export const createIndexedDbStorage = (dbName: string): StorageEngine => {
    const isIndexedDbAvailable =
        typeof indexedDB !== "undefined" && typeof window !== "undefined";

    if (!isIndexedDbAvailable) {
        return {
            async getItem(key: string) {
                return Promise.resolve(
                    typeof window !== "undefined"
                        ? window.localStorage.getItem(key)
                        : null
                );
            },
            async setItem(key: string, value: string) {
                if (typeof window !== "undefined") {
                    window.localStorage.setItem(key, value);
                }
            },
            async removeItem(key: string) {
                if (typeof window !== "undefined") {
                    window.localStorage.removeItem(key);
                }
            },
        };
    }

    return {
        async getItem(key: string) {
            return runIndexedDbOperation<string | null>(
                dbName,
                "readonly",
                (store) => store.get(key)
            );
        },
        async setItem(key: string, value: string) {
            await runIndexedDbOperation(dbName, "readwrite", (store) =>
                store.put(value, key)
            );
        },
        async removeItem(key: string) {
            await runIndexedDbOperation(dbName, "readwrite", (store) =>
                store.delete(key)
            );
        },
    };
};

export const persistReducer = <S>(
    _config: PersistConfig<S>,
    baseReducer: Reducer<S>
): Reducer<S> => {
    return (state, action) => {
        if (action.type === REHYDRATE_ACTION && action.payload) {
            return action.payload as S;
        }
        return baseReducer(state, action);
    };
};

class SimplePersistor<S> {
    private listeners = new Set<() => void>();
    private bootstrapped = false;

    constructor(
        private readonly store: Store<S>,
        private readonly config: PersistConfig<S>
    ) {}

    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        this.listeners.forEach((listener) => listener());
    }

    getBootstrapped() {
        return this.bootstrapped;
    }

    setBootstrapped(value: boolean) {
        this.bootstrapped = value;
        this.notify();
    }

    async rehydrate(migrate?: (state: Partial<S>) => Partial<S>) {
        try {
            const serialized = await this.config.storage.getItem(
                this.config.key
            );
            if (serialized) {
                const parsed = JSON.parse(serialized) as Partial<S>;
                const nextState = migrate ? migrate(parsed) : parsed;
                // Dispatch a REHYDRATE action instead of replaceState
                // This allows the rootReducer to merge persisted state with defaults
                this.store.dispatch({
                    type: REHYDRATE_ACTION,
                    payload: nextState,
                });
            }
        } catch (error) {
            console.error("Failed to rehydrate state", error);
        } finally {
            this.setBootstrapped(true);
        }
    }

    async persist() {
        const state = this.store.getState();
        const serializableState =
            this.config.whitelist && Array.isArray(this.config.whitelist)
                ? (this.config.whitelist as (keyof S)[]).reduce(
                      (acc, key) => ({ ...acc, [key]: (state as S)[key] }),
                      {} as S
                  )
                : state;
        await this.config.storage.setItem(
            this.config.key,
            JSON.stringify(serializableState)
        );
    }

    async purge() {
        await this.config.storage.removeItem(this.config.key);
    }

    async flush() {
        await this.persist();
    }
}

export interface Persistor<S> {
    subscribe: (listener: () => void) => () => void;
    getBootstrapped: () => boolean;
    flush: () => Promise<void>;
    purge: () => Promise<void>;
}

export const persistStore = <S>(
    store: Store<S>,
    config: PersistConfig<S>,
    migrate?: (state: Partial<S>) => Partial<S>,
    shouldRehydrate?: () => boolean
): Persistor<S> => {
    const persistor = new SimplePersistor(store, config);

    // Only rehydrate if shouldRehydrate returns true (or if not provided)
    if (!shouldRehydrate || shouldRehydrate()) {
        void persistor.rehydrate(migrate);
    } else {
        // Skip rehydration but still mark as bootstrapped
        persistor.setBootstrapped(true);
    }

    store.subscribe(() => {
        void persistor.persist();
    });

    return {
        subscribe: (listener) => persistor.subscribe(listener),
        getBootstrapped: () => persistor.getBootstrapped(),
        flush: () => persistor.flush(),
        purge: () => persistor.purge(),
    };
};
