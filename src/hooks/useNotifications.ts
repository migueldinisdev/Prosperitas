import { useCallback } from "react";
import { useAppDispatch } from "../store/hooks";
import { addNotification } from "../store/slices/notificationsSlice";
import { NotificationPayload } from "../core/schema-types";

export const useNotifications = () => {
    const dispatch = useAppDispatch();

    const notify = useCallback(
        (payload: NotificationPayload) => {
            dispatch(addNotification(payload));
        },
        [dispatch]
    );

    return { notify };
};
