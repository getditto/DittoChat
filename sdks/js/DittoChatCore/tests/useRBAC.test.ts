import { describe, it, expect, beforeEach } from "vitest";
import { StoreApi } from "zustand";
import { createRBACSlice, RBACSlice } from "../src/slices/useRBAC";
import { RBACConfig, PermissionKey, DEFAULT_PERMISSIONS } from "../src/types/RBAC";

describe("RBAC Slice", () => {
    let store: RBACSlice;
    let setState: StoreApi<RBACSlice>["setState"];
    let getState: StoreApi<RBACSlice>["getState"];

    beforeEach(() => {
        // Create mock set and get functions
        let state: RBACSlice;

        setState = (partial) => {
            state = typeof partial === "function" ? partial(state) : { ...state, ...partial };
        };

        getState = () => state;

        // Initialize the slice
        state = createRBACSlice(setState, getState, {});
        store = state;
    });

    describe("Default Permissions", () => {
        it("should default all permissions to true when no config is provided", () => {
            expect(store.canPerformAction("canCreateRoom")).toBe(true);
            expect(store.canPerformAction("canEditOwnMessage")).toBe(true);
            expect(store.canPerformAction("canDeleteOwnMessage")).toBe(true);
            expect(store.canPerformAction("canAddReaction")).toBe(true);
            expect(store.canPerformAction("canRemoveOwnReaction")).toBe(true);
            expect(store.canPerformAction("canMentionUsers")).toBe(true);
            expect(store.canPerformAction("canSubscribeToRoom")).toBe(true);
        });

        it("should use DEFAULT_PERMISSIONS for undefined permissions", () => {
            // Verify each permission matches DEFAULT_PERMISSIONS
            Object.keys(DEFAULT_PERMISSIONS).forEach((key) => {
                const permissionKey = key as PermissionKey;
                expect(store.canPerformAction(permissionKey)).toBe(
                    DEFAULT_PERMISSIONS[permissionKey]
                );
            });
        });
    });

    describe("Custom Permissions", () => {
        it("should respect custom permission configuration", () => {
            const customConfig: RBACConfig = {
                canCreateRoom: false,
                canEditOwnMessage: false,
            };

            let customState: RBACSlice;
            const customSetState: StoreApi<RBACSlice>["setState"] = (partial) => {
                customState = typeof partial === "function" ? partial(customState) : { ...customState, ...partial };
            };
            const customGetState: StoreApi<RBACSlice>["getState"] = () => customState;

            customState = createRBACSlice(customSetState, customGetState, { rbacConfig: customConfig });

            expect(customState.canPerformAction("canCreateRoom")).toBe(false);
            expect(customState.canPerformAction("canEditOwnMessage")).toBe(false);
            // Others should still default to true
            expect(customState.canPerformAction("canDeleteOwnMessage")).toBe(true);
            expect(customState.canPerformAction("canAddReaction")).toBe(true);
        });

        it("should handle all permissions set to false", () => {
            const restrictiveConfig: RBACConfig = {
                canCreateRoom: false,
                canEditOwnMessage: false,
                canDeleteOwnMessage: false,
                canAddReaction: false,
                canRemoveOwnReaction: false,
                canMentionUsers: false,
                canSubscribeToRoom: false,
            };

            let restrictiveState: RBACSlice;
            const restrictiveSetState: StoreApi<RBACSlice>["setState"] = (partial) => {
                restrictiveState = typeof partial === "function" ? partial(restrictiveState) : { ...restrictiveState, ...partial };
            };
            const restrictiveGetState: StoreApi<RBACSlice>["getState"] = () => restrictiveState;

            restrictiveState = createRBACSlice(restrictiveSetState, restrictiveGetState, { rbacConfig: restrictiveConfig });

            expect(restrictiveState.canPerformAction("canCreateRoom")).toBe(false);
            expect(restrictiveState.canPerformAction("canEditOwnMessage")).toBe(false);
            expect(restrictiveState.canPerformAction("canDeleteOwnMessage")).toBe(false);
            expect(restrictiveState.canPerformAction("canAddReaction")).toBe(false);
            expect(restrictiveState.canPerformAction("canRemoveOwnReaction")).toBe(false);
            expect(restrictiveState.canPerformAction("canMentionUsers")).toBe(false);
            expect(restrictiveState.canPerformAction("canSubscribeToRoom")).toBe(false);
        });

        it("should handle mixed permission configuration", () => {
            const mixedConfig: RBACConfig = {
                canCreateRoom: false,
                canEditOwnMessage: true,
                canDeleteOwnMessage: false,
                canAddReaction: true,
                // Others undefined, should default to true
            };

            let mixedState: RBACSlice;
            const mixedSetState: StoreApi<RBACSlice>["setState"] = (partial) => {
                mixedState = typeof partial === "function" ? partial(mixedState) : { ...mixedState, ...partial };
            };
            const mixedGetState: StoreApi<RBACSlice>["getState"] = () => mixedState;

            mixedState = createRBACSlice(mixedSetState, mixedGetState, { rbacConfig: mixedConfig });

            expect(mixedState.canPerformAction("canCreateRoom")).toBe(false);
            expect(mixedState.canPerformAction("canEditOwnMessage")).toBe(true);
            expect(mixedState.canPerformAction("canDeleteOwnMessage")).toBe(false);
            expect(mixedState.canPerformAction("canAddReaction")).toBe(true);
            expect(mixedState.canPerformAction("canRemoveOwnReaction")).toBe(true);
            expect(mixedState.canPerformAction("canMentionUsers")).toBe(true);
            expect(mixedState.canPerformAction("canSubscribeToRoom")).toBe(true);
        });
    });

    describe("updateRBACConfig", () => {
        it("should update permissions dynamically", () => {
            // Initially all true
            expect(store.canPerformAction("canCreateRoom")).toBe(true);

            // Update config
            store.updateRBACConfig({ canCreateRoom: false });

            // Check updated state
            expect(getState().canPerformAction("canCreateRoom")).toBe(false);
            // Others should remain true
            expect(getState().canPerformAction("canEditOwnMessage")).toBe(true);
        });

        it("should merge new config with existing config", () => {
            // Set initial config
            store.updateRBACConfig({
                canCreateRoom: false,
                canEditOwnMessage: false,
            });

            expect(getState().canPerformAction("canCreateRoom")).toBe(false);
            expect(getState().canPerformAction("canEditOwnMessage")).toBe(false);

            // Update only one permission
            store.updateRBACConfig({ canCreateRoom: true });

            expect(getState().canPerformAction("canCreateRoom")).toBe(true);
            // Previous config should be preserved
            expect(getState().canPerformAction("canEditOwnMessage")).toBe(false);
        });

        it("should handle multiple sequential updates", () => {
            store.updateRBACConfig({ canCreateRoom: false });
            store.updateRBACConfig({ canEditOwnMessage: false });
            store.updateRBACConfig({ canDeleteOwnMessage: false });

            const updatedState = getState();
            expect(updatedState.canPerformAction("canCreateRoom")).toBe(false);
            expect(updatedState.canPerformAction("canEditOwnMessage")).toBe(false);
            expect(updatedState.canPerformAction("canDeleteOwnMessage")).toBe(false);
            // Others should still be true
            expect(updatedState.canPerformAction("canAddReaction")).toBe(true);
        });

        it("should allow toggling permissions", () => {
            // Toggle false
            store.updateRBACConfig({ canCreateRoom: false });
            expect(getState().canPerformAction("canCreateRoom")).toBe(false);

            // Toggle back to true
            store.updateRBACConfig({ canCreateRoom: true });
            expect(getState().canPerformAction("canCreateRoom")).toBe(true);
        });

        it("should handle empty config update", () => {
            // Set initial config
            store.updateRBACConfig({ canCreateRoom: false });
            expect(getState().canPerformAction("canCreateRoom")).toBe(false);

            // Update with empty config (should not change anything)
            store.updateRBACConfig({});
            expect(getState().canPerformAction("canCreateRoom")).toBe(false);
        });
    });

    describe("Permission Keys", () => {
        it("should handle all valid permission keys", () => {
            const allPermissions: PermissionKey[] = [
                "canCreateRoom",
                "canEditOwnMessage",
                "canDeleteOwnMessage",
                "canAddReaction",
                "canRemoveOwnReaction",
                "canMentionUsers",
                "canSubscribeToRoom",
            ];

            allPermissions.forEach((permission) => {
                expect(typeof store.canPerformAction(permission)).toBe("boolean");
            });
        });
    });

    describe("State Structure", () => {
        it("should have correct initial state structure", () => {
            expect(store).toHaveProperty("rbacConfig");
            expect(store).toHaveProperty("canPerformAction");
            expect(store).toHaveProperty("updateRBACConfig");
            expect(typeof store.canPerformAction).toBe("function");
            expect(typeof store.updateRBACConfig).toBe("function");
        });

        it("should maintain rbacConfig in state", () => {
            const customConfig: RBACConfig = {
                canCreateRoom: false,
                canEditOwnMessage: true,
            };

            let customState: RBACSlice;
            const customSetState: StoreApi<RBACSlice>["setState"] = (partial) => {
                customState = typeof partial === "function" ? partial(customState) : { ...customState, ...partial };
            };
            const customGetState: StoreApi<RBACSlice>["getState"] = () => customState;

            customState = createRBACSlice(customSetState, customGetState, { rbacConfig: customConfig });

            expect(customState.rbacConfig).toEqual(customConfig);
        });
    });

    describe("Edge Cases", () => {
        it("should handle undefined rbacConfig parameter", () => {
            let undefinedState: RBACSlice;
            const undefinedSetState: StoreApi<RBACSlice>["setState"] = (partial) => {
                undefinedState = typeof partial === "function" ? partial(undefinedState) : { ...undefinedState, ...partial };
            };
            const undefinedGetState: StoreApi<RBACSlice>["getState"] = () => undefinedState;

            undefinedState = createRBACSlice(undefinedSetState, undefinedGetState, { rbacConfig: undefined });

            expect(undefinedState.canPerformAction("canCreateRoom")).toBe(true);
        });

        it("should handle explicit true values", () => {
            const explicitConfig: RBACConfig = {
                canCreateRoom: true,
                canEditOwnMessage: true,
            };

            let explicitState: RBACSlice;
            const explicitSetState: StoreApi<RBACSlice>["setState"] = (partial) => {
                explicitState = typeof partial === "function" ? partial(explicitState) : { ...explicitState, ...partial };
            };
            const explicitGetState: StoreApi<RBACSlice>["getState"] = () => explicitState;

            explicitState = createRBACSlice(explicitSetState, explicitGetState, { rbacConfig: explicitConfig });

            expect(explicitState.canPerformAction("canCreateRoom")).toBe(true);
            expect(explicitState.canPerformAction("canEditOwnMessage")).toBe(true);
        });

        it("should handle rapid permission updates", () => {
            // Rapid updates
            for (let i = 0; i < 10; i++) {
                store.updateRBACConfig({ canCreateRoom: i % 2 === 0 });
            }

            // Final state should be false (last iteration i=9, 9 % 2 === 0 is false)
            expect(getState().canPerformAction("canCreateRoom")).toBe(false);
        });
    });
});
