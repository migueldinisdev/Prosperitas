import React from "react";

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
    children,
    className = "",
    title,
    action,
}) => {
    return (
        <div
            className={`bg-app-card border border-app-border rounded-2xl p-4 sm:p-5 shadow-sm overflow-hidden ${className}`}
        >
            {(title || action) && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    {title && (
                        <h3 className="text-zinc-100 font-semibold text-lg tracking-tight">
                            {title}
                        </h3>
                    )}
                    {action && (
                        <div className="w-full sm:w-auto overflow-hidden">
                            {action}
                        </div>
                    )}
                </div>
            )}
            {children}
        </div>
    );
};
