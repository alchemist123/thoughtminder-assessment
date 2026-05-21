import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/layouts/AdminLayout';
import { CandidateLayout } from '@/layouts/CandidateLayout';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ExamAccessPage } from '@/pages/ExamAccessPage';
import { ExamTakePage } from '@/pages/ExamTakePage';
import { ExamSubmittedPage } from '@/pages/ExamSubmittedPage';
import { CandidateDashboardPage } from '@/pages/CandidateDashboardPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { CandidatesPage } from '@/pages/admin/CandidatesPage';
import { QuestionsPage } from '@/pages/admin/QuestionsPage';
import { ExamsPage } from '@/pages/admin/ExamsPage';
import { ExamCreatePage } from '@/pages/admin/ExamCreatePage';
import { ExamDetailPage } from '@/pages/admin/ExamDetailPage';
import { ExamResultsPage } from '@/pages/admin/ExamResultsPage';
import { CandidateReviewPage } from '@/pages/admin/CandidateReviewPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { FullPageSpinner } from '@/components/ui/LoadingSpinner';

function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/candidate'} replace />;
  }
  return children;
}

function AppRoutes() {
  const { initAuth, loading } = useAuth();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (loading) return <FullPageSpinner />;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register/:token" element={<RegisterPage />} />

      {/* Candidate exam flow — static routes MUST come before parameterised :examId */}
      <Route path="/exam/submitted" element={<ExamSubmittedPage />} />
      <Route path="/exam/:examId" element={<ExamAccessPage />} />
      <Route
        path="/exam/:examId/take"
        element={
          <ProtectedRoute requiredRole="candidate">
            <ExamTakePage />
          </ProtectedRoute>
        }
      />

      {/* Candidate dashboard */}
      <Route
        path="/candidate"
        element={
          <ProtectedRoute requiredRole="candidate">
            <CandidateLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CandidateDashboardPage />} />
      </Route>

      {/* Admin area */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="candidates" element={<CandidatesPage />} />
        <Route path="questions" element={<QuestionsPage />} />
        <Route path="exams" element={<ExamsPage />} />
        <Route path="exams/new" element={<ExamCreatePage />} />
        <Route path="exams/:examId" element={<ExamDetailPage />} />
        <Route path="exams/:examId/results" element={<ExamResultsPage />} />
        <Route path="exams/:examId/review/:candidateExamId" element={<CandidateReviewPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
