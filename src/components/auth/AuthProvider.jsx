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

    const unsubscribe = FirebaseAuth.onAuthStateChange((currentUser) => {
      if (isMounted) {
        // If we have a user but no user_type, we're still loading their data
        const isStillLoading = currentUser && !currentUser.user_type;

        setUser(currentUser);
        setIsLoading(false);
        setIsTransitioning(isStillLoading);
      }
    });

    return () => {
      isMounted = false;
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
      const currentUser = await FirebaseAuth.me();
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