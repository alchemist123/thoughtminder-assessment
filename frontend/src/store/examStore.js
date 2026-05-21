import { create } from 'zustand';
import * as examService from '@/services/examService';

const useExamStore = create((set, get) => ({
  exams: [],
  currentExam: null,
  loading: false,
  launchResult: null,

  fetchExams: async (filters = {}) => {
    set({ loading: true });
    try {
      const data = await examService.getExams(filters);
      set({ exams: data?.exams ?? [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchExam: async (id) => {
    set({ loading: true });
    try {
      const data = await examService.getExam(id);
      set({ currentExam: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createExam: async (data) => {
    return examService.createExam(data);
  },

  launchExam: async (examId, candidateIds) => {
    const result = await examService.launchExam(examId, candidateIds);
    set({ launchResult: result });
    return result;
  },

  clearLaunchResult: () => set({ launchResult: null }),
}));

export default useExamStore;
