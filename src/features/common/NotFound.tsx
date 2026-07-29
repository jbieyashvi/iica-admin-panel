import { Link } from 'react-router-dom';
import { LogoMark } from '../../components/brand/Logo';
import { Button } from '../../components/ui/Button';

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
      <LogoMark className="mb-6 h-12 w-12" />
      <p className="font-serif text-5xl font-medium text-charcoal">404</p>
      <h1 className="mt-2 text-lg font-medium text-charcoal">Page not found</h1>
      <p className="mt-1 max-w-sm text-sm text-charcoal-muted">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link to="/admin/dashboard" className="mt-6">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
