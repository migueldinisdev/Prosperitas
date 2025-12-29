import React from "react";
import { LogOut, Save, ShieldCheck } from "lucide-react";
import { useGoogleDriveSync } from "../../integrations/googleDrive/useGoogleDriveSync";
import { exportSaveJson } from "../../store/saveSerialization";
import { store } from "../../store";

export const GoogleDriveControls: React.FC = () => {
    const {
        status,
        isAuthenticated,
        signInInteractive,
        loadFromDrive,
        saveToDrive,
        signOut,
    } = useGoogleDriveSync();

    const isBusy =
        status === "authenticating" ||
        status === "loading" ||
        status === "saving";

    const handleSave = async () => {
        const json = exportSaveJson(store.getState());
        await saveToDrive(json);
    };

    if (!isAuthenticated) {
        return (
            <button
                type="button"
                onClick={async () => {
                    const authenticated = await signInInteractive();
                    if (authenticated) {
                        await loadFromDrive();
                    }
                }}
                disabled={isBusy}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group text-app-muted hover:text-app-foreground hover:bg-app-surface w-full disabled:opacity-60"
            >
                <ShieldCheck
                    size={20}
                    className="text-app-muted group-hover:text-app-foreground"
                />
                <span>Continue with Google</span>
            </button>
        );
    }

    return (
        <div className="space-y-2">
            <button
                type="button"
                onClick={handleSave}
                disabled={isBusy}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group text-app-muted hover:text-app-foreground hover:bg-app-surface w-full disabled:opacity-60"
            >
                <Save
                    size={20}
                    className="text-app-muted group-hover:text-app-foreground"
                />
                <span>Save</span>
            </button>
            <button
                type="button"
                onClick={signOut}
                disabled={isBusy}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group text-app-muted hover:text-app-foreground hover:bg-app-surface w-full disabled:opacity-60"
            >
                <LogOut
                    size={20}
                    className="text-app-muted group-hover:text-app-foreground"
                />
                <span>Sign out</span>
            </button>
        </div>
    );
};
