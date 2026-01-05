import { StoreApi } from 'zustand'

import { DEFAULT_PERMISSIONS, PermissionKey, RBACConfig } from '../types/RBAC'
import { ChatStore, CreateSlice } from '../useChat'

export interface RBACSlice {
  rbacConfig: RBACConfig
  canPerformAction: (action: PermissionKey) => boolean
  updateRBACConfig: (config: RBACConfig) => void
}

export const createRBACSlice: CreateSlice<RBACSlice> = (
  _set: StoreApi<ChatStore>['setState'],
  _get: StoreApi<ChatStore>['getState'],
  { rbacConfig = {} },
) => {
  const store: RBACSlice = {
    rbacConfig,

    /**
     * Check if a specific permission action is allowed.
     *
     * This method evaluates the RBAC configuration to determine
     * if an action is permitted. Uses a permissive-by-default approach.
     *
     * Workflow:
     * 1. Gets current RBAC config from state
     * 2. Checks if permission is explicitly set
     * 3. Returns explicit value or default (true)
     *
     * @param action - Permission key to check (e.g., 'canCreateRoom')
     * @returns boolean indicating if action is allowed
     */
    canPerformAction: (action: PermissionKey): boolean => {
      const currentConfig = _get().rbacConfig
      // If permission is explicitly set, use that value
      // Otherwise, default to true (permissive by default)
      const permissionValue = currentConfig[action]
      return permissionValue !== undefined
        ? permissionValue
        : DEFAULT_PERMISSIONS[action]
    },

    /**
     * Update the RBAC permission configuration.
     *
     * This method merges new permissions with the existing config,
     * allowing partial updates without overwriting unrelated permissions.
     *
     * Workflow:
     * 1. Merges provided config with existing rbacConfig
     * 2. Updates state with combined configuration
     *
     * @param config - Partial RBAC config with permissions to update
     */
    updateRBACConfig: (config: RBACConfig) => {
      _set((state) => ({
        ...state,
        rbacConfig: {
          ...state.rbacConfig,
          ...config,
        },
      }))
    },
  }

  return store
}
