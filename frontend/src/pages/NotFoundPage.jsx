import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();

  const handleGoHome = () => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (isAdmin) {
      navigate('/admin');
    } else {
      navigate('/candidate');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="h-8 w-8 text-muted-foreground" />
      </div>

      <div className="space-y-1">
        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <p className="text-lg font-medium">Page not found</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>

      <Button onClick={handleGoHome}>
        Back to Dashboard
      </Button>
    </div>
  );
}
