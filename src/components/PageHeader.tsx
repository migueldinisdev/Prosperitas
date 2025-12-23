import React from "react";
import { Menu } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    onMenuClick: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    action,
    onMenuClick,
}) => {
    return (
        <header className="sticky top-0 z-30 bg-app-bg/80 backdrop-blur-md border-b border-app-border px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2 -ml-2 text-app-muted hover:text-app-foreground rounded-lg hover:bg-app-surface transition-colors"
                    >
                        <Menu size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-app-foreground tracking-tight">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-sm text-app-muted mt-0.5">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {action}
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
};
