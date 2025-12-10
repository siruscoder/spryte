import client from './client';

export const addonsApi = {
  getAll: async () => {
    const response = await client.get('/addons');
    return response.data;
  },

  getCommands: async () => {
    const response = await client.get('/addons/commands');
    return response.data;
  },

  enable: async (addonId) => {
    const response = await client.post(`/addons/${addonId}/enable`);
    return response.data;
  },

  disable: async (addonId) => {
    const response = await client.post(`/addons/${addonId}/disable`);
    return response.data;
  }
};
