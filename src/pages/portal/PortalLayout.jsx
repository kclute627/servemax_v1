import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useParams, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Receipt,
  LogOut,
  Menu,
  X,
  Plus,
  Settings,
  Phone,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientAuthProvider, useClientAuth } from "@/components/auth/ClientAuthProvider";
import { entities } from "@/firebase/database";
import { Toaster } from "@/components/ui/toaster";

// Navigation items for client portal
const getPortalNavItems = (companySlug) => [
  {
    title: "Dashboard",
    url: `/portal/${companySlug}/dashboard`,
    icon: LayoutDashboard
  },
  {
    title: "Orders",
    url: `/portal/${companySlug}/orders`,
    icon: Briefcase
  },
  {
    title: "Invoices",
    url: `/portal/${companySlug}/invoices`,
    icon: Receipt
  },
  {
    title: "Contact",
    url: `/portal/${companySlug}/contact`,
    icon: Phone
  },
  {
    title: "Settings",
    url: `/portal/${companySlug}/settings`,
    icon: Settings
  }
];

function PortalSidebar({ companySlug, branding, companyName }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { clientUser, logout } = useClientAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = getPortalNavItems(companySlug);

  const handleLogout = async () => {
    await logout();
    navigate(`/portal/${companySlug}/login`);
  };

  // Dynamic brand color
  const primaryColor = branding?.primary_color || '#0f172a';

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
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
            {branding?.logo_url ? (
              <img
                src={branding.logo_url}
                alt={companyName}
                className="h-8 max-w-[140px] object-contain"
              />
            ) : (
              <span className="font-semibold text-slate-900">{companyName}</span>
            )}
          </div>

          {/* New Order Button - Mobile */}
          {clientUser?.role !== 'viewer' && (
            <Button
              size="sm"
              onClick={() => navigate(`/portal/${companySlug}/orders/new`)}
              style={{ backgroundColor: primaryColor }}
              className="text-white"
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
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
          w-72 bg-gradient-to-b from-gray-200 to-slate-200 border-r border-slate-200
          flex flex-col
          transition-transform duration-300 ease-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            {/* Circular Logo Container */}
            <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-200 shadow-md">
              {branding?.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt={companyName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center font-bold text-white text-2xl"
                  style={{ backgroundColor: primaryColor }}
                >
                  {companyName?.charAt(0) || 'P'}
                </div>
              )}
            </div>
            {/* Company Name */}
            <span className="font-bold text-slate-900 text-center truncate max-w-full">
              {companyName || 'Portal'}
            </span>
            {/* Client Portal Subtitle */}
            <span className="text-xs text-slate-500 -mt-1">
              Client Portal
            </span>
          </div>

          {/* Mobile Close */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 -mr-2 rounded-lg hover:bg-slate-100 transition-colors absolute top-4 right-4"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* New Order CTA */}
        {clientUser?.role !== 'viewer' && (
          <div className="px-4 py-4">
            <Button
              className="w-full justify-center gap-2 h-11 text-white shadow-sm"
              style={{ backgroundColor: primaryColor }}
              onClick={() => navigate(`/portal/${companySlug}/orders/new`)}
            >
              <Plus className="w-4 h-4" />
              New Order
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.url ||
                (item.title === 'Orders' && location.pathname.includes('/orders'));

              return (
                <NavLink
                  key={item.url}
                  to={item.url}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl
                    font-medium text-sm transition-all duration-150
                    ${isActive
                      ? 'text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }
                  `}
                  style={isActive ? { backgroundColor: primaryColor } : {}}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.title}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-slate-100">
          {clientUser && (
            <div className="flex items-center gap-3 mb-3 px-1">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                {clientUser.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {clientUser.name}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {clientUser.email}
                </p>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
}

function PortalContent() {
  const { companySlug } = useParams();
  const { clientUser, portalData, isLoading, isAuthenticated } = useClientAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (!location.pathname.includes('/login') && !location.pathname.includes('/accept-invite')) {
        navigate(`/portal/${companySlug}/login`);
      }
    }
  }, [isLoading, isAuthenticated, companySlug, navigate, location.pathname]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Loading your portal...</p>
        </div>
      </div>
    );
  }

  // Public routes (login, accept-invite)
  const isPublicRoute = location.pathname.includes('/login') || location.pathname.includes('/accept-invite');

  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Outlet />
      </div>
    );
  }

  // Protected routes
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <PortalSidebar
        companySlug={companySlug}
        branding={portalData?.branding}
        companyName={portalData?.company?.name}
      />
      <main className="flex-1 min-w-0 pt-16 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function PortalLayout() {
  const { companySlug } = useParams();
  const [companyExists, setCompanyExists] = useState(null);
  const [isCheckingCompany, setIsCheckingCompany] = useState(true);

  // Check if company slug is valid
  useEffect(() => {
    const checkCompany = async () => {
      try {
        const companies = await entities.Company.filter({
          'portal_settings.portal_slug': companySlug
        });

        if (companies.length === 0) {
          const allCompanies = await entities.Company.list();
          const matchingCompany = allCompanies.find(
            c => c.portal_settings?.portal_slug === companySlug
          );
          setCompanyExists(!!matchingCompany);
        } else {
          setCompanyExists(true);
        }
      } catch (error) {
        console.error('Error checking company:', error);
        setCompanyExists(false);
      } finally {
        setIsCheckingCompany(false);
      }
    };

    if (companySlug) {
      checkCompany();
    }
  }, [companySlug]);

  if (isCheckingCompany) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (companyExists === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Briefcase className="w-8 h-8 text-slate-300" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Portal Not Found</h1>
          <p className="text-slate-500">
            This client portal doesn't exist or hasn't been configured yet.
            Please check the URL and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClientAuthProvider companySlug={companySlug}>
      <PortalContent />
      <Toaster />
    </ClientAuthProvider>
  );
}
