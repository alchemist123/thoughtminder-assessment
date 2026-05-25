import api from '@/lib/axios';

export const getMalpracticeForExam = async (examId) => {
  const { data } = await api.get(`/admin/exams/${examId}/malpractice`);
  return data.data;
};

export const getMalpracticeForCandidate = async (candidateExamId) => {
  const { data } = await api.get(`/admin/candidate-exams/${candidateExamId}/malpractice`);
  return data.data;
};

export const getCandidateReview = async (candidateExamId) => {
  const { data } = await api.get(`/admin/candidate-exams/${candidateExamId}/review`);
  return data.data;
};

export const gradeWrittenAnswer = async (candidateExamId, questionId, isCorrect) => {
  const { data } = await api.put(
    `/admin/candidate-exams/${candidateExamId}/grade-written/${questionId}`,
    { is_correct: isCorrect }
  );
  return data.data;
};
