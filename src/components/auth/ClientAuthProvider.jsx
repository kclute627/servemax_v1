import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { entities } from '@/firebase/database';
import { FirebaseFunctions } from '@/firebase/functions';

const ClientAuthContext = createContext({
  clientUser: null,
  portalData: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  refreshPortalData: async () => {}
});

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (!context) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
};

export function ClientAuthProvider({ children, companySlug }) {
  const [clientUser, setClientUser] = useState(null);
  const [portalData, setPortalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load portal data when user is authenticated
  const loadPortalData = async (uid) => {
    try {
      // Get portal data from Cloud Function
      const data = await FirebaseFunctions.getClientPortalData();

      if (data.success) {
        setClientUser(data.clientUser);
        setPortalData({
          company: data.company,
          branding: data.branding,
          portalSettings: data.portalSettings,
          jobs: data.jobs,
          invoices: data.invoices
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error loading portal data:', err);
      setError(err.message);
      return false;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (firebaseUser) {
        // Check if this user has client portal access
        try {
          const clientUsers = await entities.ClientUser.filter({
            uid: firebaseUser.uid,
            is_active: true
          });

          if (clientUsers.length > 0) {
            // User has client portal access
            const loaded = await loadPortalData(firebaseUser.uid);
            if (!loaded) {
              // Failed to load portal data, clear state
              setClientUser(null);
              setPortalData(null);
            }
          } else {
            // User doesn't have client portal access
            setClientUser(null);
            setPortalData(null);
          }
        } catch (err) {
          console.error('Error checking client user:', err);
          setClientUser(null);
          setPortalData(null);
        }
      } else {
        setClientUser(null);
        setPortalData(null);
      }

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [companySlug]);

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      setError(null);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Check if user has client portal access
      const clientUsers = await entities.ClientUser.filter({
        uid: userCredential.user.uid,
        is_active: true
      });

      if (clientUsers.length === 0) {
        // User doesn't have client portal access
        await signOut(auth);
        throw new Error('You do not have access to this portal. Please contact the company administrator.');
      }

      // Load portal data
      await loadPortalData(userCredential.user.uid);

    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setClientUser(null);
      setPortalData(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const refreshPortalData = async () => {
    if (auth.currentUser) {
      await loadPortalData(auth.currentUser.uid);
    }
  };

  const value = {
    clientUser,
    portalData,
    isLoading,
    isAuthenticated: !!clientUser,
    error,
    login,
    logout,
    refreshPortalData
  };

  return (
    <ClientAuthContext.Provider value={value}>
      {children}
    </ClientAuthContext.Provider>
  );
}

// Protected route for client portal pages
export function ClientProtectedRoute({ children }) {
  const { clientUser, isLoading, isAuthenticated } = useClientAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect will be handled by PortalLayout which has access to companySlug
    return null;
  }

  return children;
}
