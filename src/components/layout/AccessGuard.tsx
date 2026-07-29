import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { NAV_GROUPS } from '../../config/navigation';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../data/store';

const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

// Required permission for a path: the nav item whose route it matches (exact or
// as a `/detail` prefix). Unmatched paths (e.g. dashboard) need no extra gate.
function requiredPermission(pathname: string) {
  const match = NAV_ITEMS.filter((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match?.permission;
}

function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
        <ShieldAlert className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="font-serif text-xl font-medium text-charcoal">Access denied</h2>
      <p className="mt-2 max-w-md text-sm text-charcoal-muted">Your role does not have access to this module.</p>
      <div className="mt-5"><Button onClick={() => navigate('/admin/dashboard')}>Back to Dashboard</Button></div>
    </div>
  );
}

export function AccessGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, can, logout } = useAuth();
  const { adminUsers } = useData();

  // Invalidate the session if this admin was deactivated / removed by another Super Admin.
  const stillActive = !!user && adminUsers.some((a) => a.id === user.id && a.status === 'active');
  useEffect(() => {
    if (user && !stillActive) {
      logout();
      navigate('/admin/login', { replace: true });
    }
  }, [user, stillActive, logout, navigate]);
  if (user && !stillActive) return null;

  const perm = requiredPermission(location.pathname);
  if (perm && !can(perm)) return <AccessDenied />;

  return <Outlet />;
}
