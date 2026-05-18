import API from '@/api';

export const documentApi = {
  // Templates
  getTemplates: async () => {
    const res = await API.get('/documents/templates');
    return res.data;
  },

  uploadTemplate: async (formData) => {
    const res = await API.post('/documents/templates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  updateTemplate: async ({ id, data }) => {
    const res = await API.put(`/documents/templates/${id}`, data);
    return res.data;
  },

  deleteTemplate: async (id) => {
    const res = await API.delete(`/documents/templates/${id}`);
    return res.data;
  },

  // Generation
  generate: async (payload) => {
    const res = await API.post('/documents/generate', payload, { responseType: 'blob' });
    return res.data;
  },
};
