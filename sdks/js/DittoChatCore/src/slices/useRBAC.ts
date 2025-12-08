import { StoreApi } from "zustand";
import { ChatStore, CreateSlice } from "../useChat";
import { RBACConfig, PermissionKey, DEFAULT_PERMISSIONS } from "../types/RBAC";

export interface RBACSlice {
    rbacConfig: RBACConfig;
    canPerformAction: (action: PermissionKey) => boolean;
    updateRBACConfig: (config: RBACConfig) => void;
}

export const createRBACSlice: CreateSlice<RBACSlice> = (
    _set: StoreApi<ChatStore>["setState"],
    _get: StoreApi<ChatStore>["getState"],
    { rbacConfig = {} }
) => {
    const store: RBACSlice = {
        rbacConfig,

        /**
         * Checks if the current user has permission to perform a specific action.
         * 
         * This function implements a permission checking system with fallback defaults:
         * 
         * 1. **Check Current Configuration**:
         *    - Retrieves the current RBAC configuration from state
         *    - Looks up the permission value for the requested action
         * 
         * 2. **Apply Fallback Logic**:
         *    - If permission is explicitly set in config, uses that value
         *    - If permission is not configured, falls back to DEFAULT_PERMISSIONS
         *    - This ensures predictable behavior even for unconfigured permissions
         * 
         * This approach ensures:
         * - Explicit configuration takes precedence
         * - Safe defaults for permissions not yet configured
         * - Consistent permission behavior across the application
         * 
         * @param action - The permission key to check (e.g., "canCreateRoom", "canSubscribeToRoom")
         * @returns true if the action is permitted, false otherwise
         */
        canPerformAction: (action: PermissionKey): boolean => {
            const currentConfig = _get().rbacConfig;
            // If permission is explicitly set, use that value
            // Otherwise, default to true (permissive by default)
            const permissionValue = currentConfig[action];
            return permissionValue !== undefined
                ? permissionValue
                : DEFAULT_PERMISSIONS[action];
        },

        /**
         * Updates the RBAC configuration with new permission settings.
         * 
         * This function implements a merge strategy for updating permissions:
         * 
         * 1. **Preserve Existing State**:
         *    - Spreads the current state to maintain all other properties
         *    - Ensures non-RBAC state is not affected
         * 
         * 2. **Merge Configuration**:
         *    - Spreads the current RBAC config first
         *    - Applies the new config on top
         *    - This allows partial updates without losing existing permissions
         * 
         * This approach ensures:
         * - Partial updates are supported (only changed permissions need to be provided)
         * - Existing permissions are preserved unless explicitly overridden
         * - State updates are immutable and safe
         * 
         * @param config - Partial or complete RBAC configuration to merge with existing config
         */
        updateRBACConfig: (config: RBACConfig) => {
            _set((state) => ({
                ...state,
                rbacConfig: {
                    ...state.rbacConfig,
                    ...config,
                },
            }));
        },
    };

    return store;
};
