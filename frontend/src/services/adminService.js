import api from '@/lib/axios';

export const generateRegistrationLink = async () => {
  const { data } = await api.post('/admin/registration-links');
  const token = data.data.token;
  return {
    ...data.data,
    url: `${window.location.origin}/register/${token}`,
  };
};

export const getRegistrationLinks = async () => {
  const { data } = await api.get('/admin/registration-links');
  return data.data;
};

export const deactivateLink = async (id) => {
  const { data } = await api.delete(`/admin/registration-links/${id}`);
  return data.data;
};

export const getCandidates = async ({ stream, batch, search, page = 1, limit = 20 } = {}) => {
  const params = { page, limit };
  if (search) params.search = search;
  if (stream) params.stream = stream;
  if (batch) params.batch = batch;
  const { data } = await api.get('/admin/candidates', { params });
  return data.data;
};

export const getCandidate = async (id) => {
  const { data } = await api.get(`/admin/candidates/${id}`);
  return data.data;
};

export const getExams = async (params = {}) => {
  const { data } = await api.get('/admin/exams', { params });
  return data.data;
};

export const getQuestions = async (params = {}) => {
  const { data } = await api.get('/admin/questions', { params });
  return data.data;
};

export const deleteCandidate = async (id) => {
  const { data } = await api.delete(`/admin/candidates/${id}`);
  return data;
};

export const deleteExam = async (id) => {
  const { data } = await api.delete(`/admin/exams/${id}`);
  return data;
};
