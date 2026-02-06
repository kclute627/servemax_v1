import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Briefcase,
  LogOut,
  Menu,
  X,
  Users,
  HardHat,
  Bell,
  User as UserIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/toaster";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";

// Navigation items for IC portal
const getICNavItems = () => [
  {
    title: "Jobs",
    url: "/ic/jobs",
    icon: Briefcase
  },
  {
    title: "Connections",
    url: "/ic/connections",
    icon: Users
  }
];

export default function ICLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [pendingConnectionsCount, setPendingConnectionsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = getICNavItems();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Get user data from Firestore
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            // Verify this is an IC user
            if (data.user_type !== 'independent_contractor') {
              // Not an IC user, redirect to main app
              navigate('/Dashboard', { replace: true });
              return;
            }
            setUserData(data);

            // Get pending connection requests count
            const connectionsQuery = query(
              collection(db, "ic_connection_requests"),
              where("ic_user_id", "==", firebaseUser.uid),
              where("status", "==", "pending")
            );
            const connectionsSnap = await getDocs(connectionsQuery);
            setPendingConnectionsCount(connectionsSnap.size);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        // Not logged in, redirect to login
        navigate('/Login', { replace: true });
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    navigate('/Login', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>

          {/* Mobile Logo */}
          <div className="flex items-center gap-2">
            <HardHat className="w-6 h-6 text-emerald-600" />
            <span className="font-semibold text-slate-900">ServeMax IC</span>
          </div>

          {/* Connection Notifications */}
          <NavLink to="/ic/connections" className="relative p-2">
            <Bell className="w-5 h-5 text-slate-600" />
            {pendingConnectionsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingConnectionsCount}
              </span>
            )}
          </NavLink>
        </div>
      </header>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen
          w-64 bg-slate-900 text-white
          flex flex-col
          transition-transform duration-300 ease-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Close button (mobile) */}
        <button
          className="lg:hidden absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
          onClick={() => setIsMobileOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo Section */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <HardHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">ServeMax</h1>
              <p className="text-xs text-slate-400">Independent Contractor</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{userData.full_name}</p>
              <p className="text-xs text-slate-400 truncate">{userData.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.url ||
                              (item.url === '/ic/jobs' && location.pathname.startsWith('/ic/job/'));
              return (
                <li key={item.url}>
                  <NavLink
                    to={item.url}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                      ${isActive
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.title}</span>
                    {item.title === 'Connections' && pendingConnectionsCount > 0 && (
                      <Badge className="ml-auto bg-red-500 text-white hover:bg-red-500">
                        {pendingConnectionsCount}
                      </Badge>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-700">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-0 pt-16 lg:pt-0 min-h-screen">
        <div className="flex">
          {/* Spacer for sidebar on desktop */}
          <div className="hidden lg:block w-64 shrink-0" />

          {/* Content area */}
          <div className="flex-1 p-4 lg:p-8">
            <Outlet context={{ user, userData, pendingConnectionsCount }} />
          </div>
        </div>
      </main>

      <Toaster />
    </div>
  );
}
