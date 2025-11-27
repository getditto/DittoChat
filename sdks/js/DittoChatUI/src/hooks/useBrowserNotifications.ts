import { useState, useCallback, useRef, useEffect } from "react";

export type NotificationPermission = "default" | "granted" | "denied";

export interface BrowserNotificationOptions {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    data?: Record<string, unknown>;
    onClick?: (data?: Record<string, unknown>) => void;
}

export interface UseBrowserNotificationsReturn {
    permission: NotificationPermission;
    isSupported: boolean;
    requestPermission: () => Promise<NotificationPermission>;
    showNotification: (options: BrowserNotificationOptions) => void;
}

export const useBrowserNotifications = (): UseBrowserNotificationsReturn => {
    const [permission, setPermission] = useState<NotificationPermission>(
        typeof window !== "undefined" && "Notification" in window
            ? Notification.permission
            : "default"
    );

    const isSupported =
        typeof window !== "undefined" && "Notification" in window;

    const clickHandlersRef = useRef<
        Map<string, (data?: Record<string, unknown>) => void>
    >(new Map());

    const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
        if (!isSupported) {
            console.warn("Browser notifications are not supported");
            return "denied";
        }

        if (permission === "granted") {
            return "granted";
        }

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result;
        } catch (error) {
            console.error("Error requesting notification permission:", error);
            return "denied";
        }
    }, [isSupported, permission]);

    const showNotification = useCallback(
        (options: BrowserNotificationOptions) => {
            const { title, body, icon, tag, data, onClick } = options;

            if (!isSupported) {
                console.warn("Browser notifications are not supported");
                return;
            }

            if (permission !== "granted") {
                console.warn(
                    "Notification permission not granted. Current permission:",
                    permission
                );
                return;
            }

            try {
                const notification = new Notification(title, {
                    body,
                    icon,
                    tag,
                    data,
                    requireInteraction: false,
                });

                // Store click handler if provided
                if (onClick && tag) {
                    clickHandlersRef.current.set(tag, onClick);
                }

                notification.onclick = () => {
                    window.focus();
                    if (onClick) {
                        onClick(data);
                    } else if (tag && clickHandlersRef.current.has(tag)) {
                        clickHandlersRef.current.get(tag)?.(data);
                    }
                    notification.close();
                };

                // Auto-close after 5 seconds
                setTimeout(() => {
                    notification.close();
                }, 5000);
            } catch (error) {
                console.error("Error showing notification:", error);
            }
        },
        [isSupported, permission]
    );

    // Update permission state if it changes externally
    useEffect(() => {
        if (!isSupported) return;

        const handlePermissionChange = () => {
            setPermission(Notification.permission);
        };

        // Some browsers support permission change events
        if ("permissions" in navigator) {
            navigator.permissions
                .query({ name: "notifications" as PermissionName })
                .then((permissionStatus) => {
                    permissionStatus.onchange = handlePermissionChange;
                })
                .catch(() => {
                    // Permission API not fully supported, ignore
                });
        }
    }, [isSupported]);

    return {
        permission,
        isSupported,
        requestPermission,
        showNotification,
    };
};
