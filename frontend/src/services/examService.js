import api from '@/lib/axios';

export const getExams = async (params = {}) => {
  const { data } = await api.get('/admin/exams', { params });
  return data.data;
};

export const getExam = async (id) => {
  const { data } = await api.get(`/admin/exams/${id}`);
  return data.data;
};

export const createExam = async (payload) => {
  const { data } = await api.post('/admin/exams', payload);
  return data.data;
};

export const updateExam = async (id, payload) => {
  const { data } = await api.put(`/admin/exams/${id}`, payload);
  return data.data;
};

export const launchExam = async (id, candidateIds) => {
  const { data } = await api.post(`/admin/exams/${id}/launch`, {
    candidate_ids: candidateIds,
  });
  return data.data;
};

export const getResults = async (id) => {
  const { data } = await api.get(`/admin/exams/${id}/results`);
  return data.data;
};
