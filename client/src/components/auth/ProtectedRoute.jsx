import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Spinner from '@/components/common/Spinner';
import Button from '@/components/common/Button';

/**
 * Route wrapper that ensures the user is logged in.
 * If not authenticated, redirects to /login and saves current location in state.
 * Optional roles array can restrict access to specific roles (e.g. 'admin').
 */
export function ProtectedRoute({ children, roles = [] }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <span className="text-xs font-medium text-surface-500">
          Verifying session...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    // Insufficient permissions - display explicit Access Denied page
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-2xl bg-white border border-surface-200 text-center shadow-card space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-surface-900">Access Denied</h2>
          <p className="text-xs text-surface-500 mt-1.5 leading-relaxed">
            You do not have administrative privileges to access this area. This section is restricted to StudySync platform administrators.
          </p>
        </div>
        <div className="pt-2">
          <Link to="/">
            <Button variant="primary" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Return to Home Feed
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
