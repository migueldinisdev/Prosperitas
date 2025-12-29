import React from "react";
import { useGoogleDriveSync } from "../../hooks/useGoogleDriveSync";

export const SaveStatusBadge: React.FC = () => {
    const { isDirty } = useGoogleDriveSync();

    if (!isDirty) {
        return null;
    }

    return (
        <span className="text-xs font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
            Unsaved
        </span>
    );
};
