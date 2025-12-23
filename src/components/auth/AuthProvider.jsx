import { createContext, useContext, useState, useEffect } from 'react';
import { FirebaseAuth } from '@/firebase/auth';

const AuthContext = createContext({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {}
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let transitionTimeout = null;

    const unsubscribe = FirebaseAuth.onAuthStateChange((currentUser) => {
      if (isMounted) {
        // If we have a user but no user_type, we're still loading their data
        const isStillLoading = currentUser && !currentUser.user_type;

        setUser(currentUser);
        setIsLoading(false);
        setIsTransitioning(isStillLoading);

        // Clear any existing timeout
        if (transitionTimeout) {
          clearTimeout(transitionTimeout);
          transitionTimeout = null;
        }

        // If still transitioning after 5 seconds, this user likely doesn't belong in main app
        // (e.g., client portal user). Sign them out to prevent infinite spinner.
        // But only if we're NOT on a portal route (portal has its own auth via ClientAuthProvider)
        // Also skip if registration is in progress - the user document is being created
        if (isStillLoading) {
          transitionTimeout = setTimeout(async () => {
            if (isMounted) {
              // Don't sign out if registration is still in progress
              if (FirebaseAuth.isRegistrationInProgress()) {
                console.log('Registration still in progress, not signing out');
                return;
              }

              const isPortalRoute = window.location.pathname.startsWith('/portal/');
              if (!isPortalRoute) {
                console.warn('User has no user_type after timeout - likely a portal user. Signing out.');
                await FirebaseAuth.logout();
              }
            }
          }, 5000);
        }
      }
    });

    return () => {
      isMounted = false;
      if (transitionTimeout) {
        clearTimeout(transitionTimeout);
      }
      unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    try {
      await FirebaseAuth.login(email, password);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await FirebaseAuth.logout();
    } catch (error) {
      throw error;
    }
  };

  const refresh = async () => {
    try {
      const currentUser = await FirebaseAuth.refreshCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
      throw error;
    }
  };

  const value = {
    user,
    isLoading: isLoading || isTransitioning,
    isAuthenticated: !!user,
    isTransitioning,
    login,
    logout,
    refresh
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}