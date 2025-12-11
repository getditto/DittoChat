import { StoreApi } from 'zustand'
import { ChatStore, CreateSlice } from '../useChat'
import { RBACConfig, PermissionKey, DEFAULT_PERMISSIONS } from '../types/RBAC'

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

    canPerformAction: (action: PermissionKey): boolean => {
      const currentConfig = _get().rbacConfig
      // If permission is explicitly set, use that value
      // Otherwise, default to true (permissive by default)
      const permissionValue = currentConfig[action]
      return permissionValue !== undefined
        ? permissionValue
        : DEFAULT_PERMISSIONS[action]
    },

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
