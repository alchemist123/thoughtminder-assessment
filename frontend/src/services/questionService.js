import api from '@/lib/axios';

export const getQuestions = async (params = {}) => {
  const { data } = await api.get('/admin/questions', { params });
  return data.data;
};

export const getQuestion = async (id) => {
  const { data } = await api.get(`/admin/questions/${id}`);
  return data.data;
};

export const createQuestion = async (payload) => {
  const { data } = await api.post('/admin/questions', payload);
  return data.data;
};

export const updateQuestion = async (id, payload) => {
  const { data } = await api.put(`/admin/questions/${id}`, payload);
  return data.data;
};

export const deleteQuestion = async (id) => {
  const { data } = await api.delete(`/admin/questions/${id}`);
  return data.data;
};

export const bulkImport = async (array) => {
  const { data } = await api.post('/admin/questions/bulk', array);
  return data.data;
};
