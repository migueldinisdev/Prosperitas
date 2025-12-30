import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Notification, NotificationPayload, NotificationState } from "../../core/schema-types";

const createNotificationId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `notification_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const initialState: NotificationState = [];

const notificationsSlice = createSlice({
    name: "notifications",
    initialState,
    reducers: {
        addNotification: {
            reducer: (state, action: PayloadAction<Notification>) => {
                state.push(action.payload);
            },
            prepare: (payload: NotificationPayload) => ({
                payload: {
                    id: createNotificationId(),
                    createdAt: new Date().toISOString(),
                    ...payload,
                    timeout: payload.timeout ?? 5000,
                },
            }),
        },
        removeNotification: (state, action: PayloadAction<string>) =>
            state.filter((notification) => notification.id !== action.payload),
        clearNotifications: () => [],
    },
});

export const { addNotification, removeNotification, clearNotifications } =
    notificationsSlice.actions;

export default notificationsSlice.reducer;
