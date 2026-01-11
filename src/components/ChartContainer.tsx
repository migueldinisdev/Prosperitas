import React, { useEffect, useRef, useState } from "react";
import { Spinner } from "../ui/Spinner";

interface ChartContainerProps {
    height: number;
    isLoading?: boolean;
    children: React.ReactNode;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
    height,
    isLoading = false,
    children,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isSized, setIsSized] = useState(false);

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const updateSize = () => {
            const { width, height: measuredHeight } =
                element.getBoundingClientRect();
            setIsSized(width > 0 && measuredHeight > 0);
        };

        updateSize();

        if (typeof ResizeObserver === "undefined") {
            setIsSized(true);
            return;
        }

        const observer = new ResizeObserver(() => updateSize());
        observer.observe(element);
        return () => observer.disconnect();
    }, [height]);

    const showSpinner = isLoading || !isSized;

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height,
                minHeight: height,
                minWidth: 0,
                position: "relative",
            }}
        >
            {showSpinner ? (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Spinner size={24} />
                </div>
            ) : (
                children
            )}
        </div>
    );
};
