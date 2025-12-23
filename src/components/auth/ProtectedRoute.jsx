import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { createPageUrl } from '@/utils';
import { FirebaseAuth } from '@/firebase/auth';

export function ProtectedRoute({ children, requireAuth = true }) {
  const { user, isLoading, isAuthenticated, isTransitioning, logout } = useAuth();

  // If user is authenticated but has no user_type, sign them out
  // This handles client portal users trying to access main app routes
  // But only if we're NOT on a portal route (portal has its own auth via ClientAuthProvider)
  // Also skip if registration is in progress - the user document is being created
  useEffect(() => {
    if (user && !user.user_type) {
      // Don't sign out if registration is still in progress
      if (FirebaseAuth.isRegistrationInProgress()) {
        console.log('Registration in progress, not signing out user without user_type');
        return;
      }

      const isPortalRoute = window.location.pathname.startsWith('/portal/');
      if (!isPortalRoute) {
        console.warn('User without user_type detected in main app - signing out');
        logout();
      }
    }
  }, [user, logout]);

  // Show loading only during initial auth check (not transitioning)
  if (isLoading && !isTransitioning) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated but has no user_type, they're not a main app user
  // (likely a client portal user) - redirect to login (logout happens via useEffect above)
  // But only if we're NOT on a portal route and registration is not in progress
  if (user && !user.user_type) {
    // Don't redirect during registration - wait for user document to be created
    if (FirebaseAuth.isRegistrationInProgress()) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">Setting up your account...</p>
          </div>
        </div>
      );
    }

    const isPortalRoute = window.location.pathname.startsWith('/portal/');
    if (!isPortalRoute) {
      return <Navigate to={createPageUrl('Login')} replace />;
    }
  }

  // If route requires authentication and user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={createPageUrl('Login')} replace />;
  }

  // If route is for unauthenticated users (like login/signup) and user is authenticated
  // Redirect to dashboard - email verification is optional (can verify later from Settings)
  if (!requireAuth && isAuthenticated && user?.user_type) {
    return <Navigate to={createPageUrl('Dashboard')} replace />;
  }

  return children;
}

export function PublicRoute({ children }) {
  return <ProtectedRoute requireAuth={false}>{children}</ProtectedRoute>;
}