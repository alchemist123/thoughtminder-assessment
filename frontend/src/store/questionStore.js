import { create } from 'zustand';
import * as questionService from '@/services/questionService';

const useQuestionStore = create((set, get) => ({
  questions: [],
  total: 0,
  loading: false,
  filters: {
    section: 'quantitative',
    type: '',
    difficulty: '',
    search: '',
    page: 1,
    limit: 20,
  },

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  resetFilters: () =>
    set((state) => ({
      filters: {
        ...state.filters,
        type: '',
        difficulty: '',
        search: '',
        page: 1,
      },
    })),

  fetchQuestions: async (filtersOverride) => {
    const filters = filtersOverride ?? get().filters;
    set({ loading: true });
    try {
      const params = { page: filters.page, limit: filters.limit };
      if (filters.section) params.section = filters.section;
      if (filters.type) params.type = filters.type;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.search) params.search = filters.search;

      const data = await questionService.getQuestions(params);
      set({
        questions: data?.questions ?? [],
        total: data?.pagination?.total ?? 0,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  createQuestion: async (payload) => {
    return questionService.createQuestion(payload);
  },

  updateQuestion: async (id, payload) => {
    return questionService.updateQuestion(id, payload);
  },

  deleteQuestion: async (id) => {
    await questionService.deleteQuestion(id);
    await get().fetchQuestions();
  },
}));

export default useQuestionStore;
