import React, {
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    className?: string;
}

export const Tooltip = ({ content, children, className }: TooltipProps) => {
    const tooltipId = useId();
    const triggerRef = useRef<HTMLSpanElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [placement, setPlacement] = useState<"top" | "bottom">("bottom");

    const updatePosition = () => {
        const trigger = triggerRef.current;
        const tooltip = tooltipRef.current;
        if (!trigger || !tooltip) return;

        const rect = trigger.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const padding = 8;
        const offset = 8;

        let top = rect.bottom + offset;
        let nextPlacement: "top" | "bottom" = "bottom";

        if (top + tooltipRect.height > window.innerHeight - padding) {
            top = rect.top - tooltipRect.height - offset;
            nextPlacement = "top";
        }

        let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

        setPosition({ top, left });
        setPlacement(nextPlacement);
    };

    useLayoutEffect(() => {
        if (!isVisible) return;
        updatePosition();
    }, [isVisible, content]);

    useEffect(() => {
        if (!isVisible) return;
        const handleUpdate = () => updatePosition();
        window.addEventListener("resize", handleUpdate);
        window.addEventListener("scroll", handleUpdate, true);
        return () => {
            window.removeEventListener("resize", handleUpdate);
            window.removeEventListener("scroll", handleUpdate, true);
        };
    }, [isVisible]);

    return (
        <>
            <span
                ref={triggerRef}
                className={`inline-flex items-center ${className ?? ""}`}
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                onFocus={() => setIsVisible(true)}
                onBlur={() => setIsVisible(false)}
                aria-describedby={isVisible ? tooltipId : undefined}
                tabIndex={0}
            >
                {children}
            </span>
            {isVisible &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        ref={tooltipRef}
                        id={tooltipId}
                        role="tooltip"
                        className="pointer-events-none fixed z-[1000] w-max max-w-xs rounded-lg border border-app-border bg-app-surface px-2 py-1 text-xs text-app-foreground shadow-lg"
                        style={{ top: position.top, left: position.left }}
                        data-placement={placement}
                    >
                        {content}
                    </div>,
                    document.body
                )}
        </>
    );
};
