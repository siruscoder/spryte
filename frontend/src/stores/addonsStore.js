import { create } from 'zustand';
import { addonsApi } from '../api';

const useAddonsStore = create((set, get) => ({
  addons: [],
  templates: [],
  actions: [],
  uiComponents: [],
  isLoading: false,
  error: null,

  fetchAddons: async () => {
    set({ isLoading: true, error: null });
    try {
      const addons = await addonsApi.getAll();
      set({ addons, isLoading: false });
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to fetch addons', 
        isLoading: false 
      });
    }
  },

  fetchCommands: async () => {
    try {
      const { templates, actions, ui_components } = await addonsApi.getCommands();
      set({ templates, actions, uiComponents: ui_components || [] });
    } catch (error) {
      console.error('Failed to fetch addon commands:', error);
    }
  },

  enableAddon: async (addonId) => {
    try {
      await addonsApi.enable(addonId);
      // Optimistic update or refetch
      const { addons } = get();
      const updatedAddons = addons.map(addon => 
        addon.id === addonId ? { ...addon, enabled: true } : addon
      );
      set({ addons: updatedAddons });
      // Refetch commands since enabled addons changed
      get().fetchCommands();
      return true;
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to enable addon' });
      return false;
    }
  },

  disableAddon: async (addonId) => {
    try {
      await addonsApi.disable(addonId);
      // Optimistic update
      const { addons } = get();
      const updatedAddons = addons.map(addon => 
        addon.id === addonId ? { ...addon, enabled: false } : addon
      );
      set({ addons: updatedAddons });
      // Refetch commands since enabled addons changed
      get().fetchCommands();
      return true;
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to disable addon' });
      return false;
    }
  }
}));

export default useAddonsStore;
