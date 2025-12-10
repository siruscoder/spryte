import client from './client';

export const remindersApi = {
  getAll: async (includeCompleted = false) => {
    const response = await client.get('/reminders', {
      params: { include_completed: includeCompleted }
    });
    return response.data;
  },

  getDue: async () => {
    const response = await client.get('/reminders/due');
    return response.data;
  },

  create: async ({ noteId, blockId, message, dueDate, earlyReminderMinutes = 0 }) => {
    const response = await client.post('/reminders', {
      note_id: noteId,
      block_id: blockId,
      message,
      due_date: dueDate,
      early_reminder_minutes: earlyReminderMinutes,
    });
    return response.data;
  },

  complete: async (reminderId) => {
    const response = await client.post(`/reminders/${reminderId}/complete`);
    return response.data;
  },

  markNotified: async (reminderId) => {
    const response = await client.post(`/reminders/${reminderId}/notified`);
    return response.data;
  },

  delete: async (reminderId) => {
    const response = await client.delete(`/reminders/${reminderId}`);
    return response.data;
  },
};
