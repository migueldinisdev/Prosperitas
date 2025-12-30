import React, { useEffect, useMemo, useRef } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectNotifications } from "../store/selectors";
import { removeNotification } from "../store/slices/notificationsSlice";
import { NotificationType } from "../core/schema-types";

const iconByType: Record<
    NotificationType,
    React.ComponentType<{ size?: number }>
> = {
    info: Info,
    warning: AlertTriangle,
    error: XCircle,
    success: CheckCircle2,
};

export const Notifications: React.FC = () => {
    const notifications = useAppSelector(selectNotifications);
    const dispatch = useAppDispatch();
    const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

    const orderedNotifications = useMemo(
        () =>
            [...(notifications ?? [])].sort((a, b) =>
                a.createdAt.localeCompare(b.createdAt)
            ),
        [notifications]
    );

    useEffect(() => {
        orderedNotifications.forEach((notification) => {
            if (!notification.timeout || notification.timeout <= 0) {
                return;
            }
            if (timersRef.current.has(notification.id)) {
                return;
            }
            const timeout = setTimeout(() => {
                dispatch(removeNotification(notification.id));
            }, notification.timeout);
            timersRef.current.set(notification.id, timeout);
        });

        timersRef.current.forEach((timeout, id) => {
            if (
                !orderedNotifications.find(
                    (notification) => notification.id === id
                )
            ) {
                clearTimeout(timeout);
                timersRef.current.delete(id);
            }
        });
    }, [dispatch, orderedNotifications]);

    useEffect(() => {
        return () => {
            timersRef.current.forEach((timeout) => clearTimeout(timeout));
            timersRef.current.clear();
        };
    }, []);

    if (orderedNotifications.length === 0) {
        return null;
    }

    return (
        <div className="notification-stack" aria-live="polite">
            {orderedNotifications.map((notification) => {
                const Icon = iconByType[notification.type];
                return (
                    <div
                        key={notification.id}
                        className="notification-card"
                        data-type={notification.type}
                        role="status"
                    >
                        <span className="notification-icon">
                            <Icon size={18} />
                        </span>
                        <div className="notification-content">
                            {notification.title && (
                                <p className="notification-title">
                                    {notification.title}
                                </p>
                            )}
                            <p className="notification-message">
                                {notification.message}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="notification-dismiss"
                            aria-label="Dismiss notification"
                            onClick={() =>
                                dispatch(removeNotification(notification.id))
                            }
                        >
                            <X size={16} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
