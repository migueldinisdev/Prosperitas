import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";
import { persistor, store } from "./store";
import { PersistGate } from "./store/PersistGate";
import { SyncStatusProvider } from "./store/syncStatus";

const rootElement = document.getElementById("root");
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <SyncStatusProvider>
                    <ThemeProvider>
                        <App />
                    </ThemeProvider>
                </SyncStatusProvider>
            </PersistGate>
        </Provider>
    </React.StrictMode>
);
