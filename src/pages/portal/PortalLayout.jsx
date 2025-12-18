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
  Building2,
  User
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
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
  }
];

function PortalSidebar({ companySlug, branding, companyName }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { clientUser, logout } = useClientAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = getPortalNavItems(companySlug);

  const handleLogout = async () => {
    await logout();
    navigate(`/portal/${companySlug}/login`);
  };

  // Dynamic styles based on branding
  const primaryColor = branding?.primary_color || '#1e40af';
  const accentColor = branding?.accent_color || '#3b82f6';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo/Company Name */}
      <div className="p-4 border-b border-slate-200">
        {branding?.logo_url ? (
          <img
            src={branding.logo_url}
            alt={companyName}
            className={`${isCollapsed ? 'w-10 h-10' : 'h-12 max-w-[180px]'} object-contain`}
          />
        ) : (
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8" style={{ color: primaryColor }} />
            {!isCollapsed && (
              <span className="font-semibold text-slate-900 truncate">
                {companyName || 'Client Portal'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <TooltipProvider key={item.title} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.url}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    style={isActive ? { backgroundColor: primaryColor } : {}}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </NavLink>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    {item.title}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-200">
        {clientUser && !isCollapsed && (
          <div className="flex items-center gap-2 mb-3 px-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
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
          className={`w-full justify-start gap-3 text-slate-600 hover:text-red-600 hover:bg-red-50 ${
            isCollapsed ? 'px-3' : ''
          }`}
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-slate-200 transition-all duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'w-16' : 'w-64'}`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Collapse Toggle */}
      <button
        className="hidden lg:flex absolute left-64 top-6 -ml-3 w-6 h-6 items-center justify-center bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 z-50 transition-all duration-300"
        style={{ left: isCollapsed ? '64px' : '256px' }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
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
      // Don't redirect if already on login or accept-invite pages
      if (!location.pathname.includes('/login') && !location.pathname.includes('/accept-invite')) {
        navigate(`/portal/${companySlug}/login`);
      }
    }
  }, [isLoading, isAuthenticated, companySlug, navigate, location.pathname]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading portal...</p>
        </div>
      </div>
    );
  }

  // Check if on login or accept-invite page (public routes)
  const isPublicRoute = location.pathname.includes('/login') || location.pathname.includes('/accept-invite');

  // For public routes, render without sidebar
  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Outlet />
      </div>
    );
  }

  // For protected routes, render with sidebar
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <PortalSidebar
        companySlug={companySlug}
        branding={portalData?.branding}
        companyName={portalData?.company?.name}
      />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <Outlet />
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

        // If that doesn't work, try a different approach - get all companies and filter
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
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (companyExists === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Portal Not Found</h1>
          <p className="text-slate-600">
            The client portal you're looking for doesn't exist or is not configured.
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
