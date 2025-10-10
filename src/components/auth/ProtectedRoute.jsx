import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { createPageUrl } from '@/utils';

export function ProtectedRoute({ children, requireAuth = true }) {
  const { user, isLoading, isAuthenticated, isTransitioning } = useAuth();

  // Show loading while checking authentication or transitioning user data
  if (isLoading || isTransitioning) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">
            {isTransitioning ? 'Setting up your account...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // If route requires authentication and user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={createPageUrl('Login')} replace />;
  }

  // If route is for unauthenticated users (like login/signup) and user is authenticated
  if (!requireAuth && isAuthenticated) {
    return <Navigate to={createPageUrl('Dashboard')} replace />;
  }

  return children;
}

export function PublicRoute({ children }) {
  return <ProtectedRoute requireAuth={false}>{children}</ProtectedRoute>;
}