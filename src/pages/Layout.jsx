
import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  UserCheck,
  Receipt,
  FileText,
  LogOut,
  CreditCard,
  ChevronLeft,
  Menu,
  X,
  HandCoins,
  Settings,
  BookUser,
  Building2,
  Activity,
  Shield
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAvailableMenuItems, isSuperAdmin } from "@/utils/permissions";
import logo from "../../src/images/logo12.png";
import logo1 from "../../src/images/logo13.png";

// Regular user navigation
const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard
  },
  {
    title: "Jobs",
    url: createPageUrl("Jobs"),
    icon: Briefcase
  },
  {
    title: "Clients",
    url: createPageUrl("Clients"),
    icon: Users
  },
  {
    title: "Employees",
    url: createPageUrl("Employees"),
    icon: UserCheck
  },
  {
    title: "Directory",
    url: createPageUrl("Directory"),
    icon: BookUser
  },
  {
    title: "Accounting",
    url: createPageUrl("Accounting"),
    icon: Receipt
  },
  {
    title: "Server Pay",
    url: createPageUrl("ServerPay"),
    icon: HandCoins
  },
  {
    title: "Settings",
    url: createPageUrl("Settings"),
    icon: Settings
  }
];

// Super admin navigation
const superAdminNavigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard
  },
  {
    title: "Jobs",
    url: createPageUrl("Jobs"),
    icon: Briefcase
  },
  {
    title: "Companies",
    url: createPageUrl("Companies"),
    icon: Building2
  },
  {
    title: "Subscriptions",
    url: createPageUrl("Subscriptions"),
    icon: CreditCard
  },
  {
    title: "System",
    url: createPageUrl("System"),
    icon: Activity
  },
  {
    title: "Templates",
    url: createPageUrl("TemplatesManagement"),
    icon: FileText
  },
  {
    title: "Settings",
    url: createPageUrl("Settings"),
    icon: Settings
  }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [availableMenuItems, setAvailableMenuItems] = useState([]);
  const [isUserSuperAdmin, setIsUserSuperAdmin] = useState(false);

  // Persist collapse state in localStorage
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true"
  );

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", isCollapsed);
  }, [isCollapsed]);

  // Update available menu items when user changes
  useEffect(() => {
    if (user) {
      const superAdmin = isSuperAdmin(user);
      setIsUserSuperAdmin(superAdmin);
      const menuItems = getAvailableMenuItems(user);
      setAvailableMenuItems(menuItems);
    } else {
      setIsUserSuperAdmin(false);
      setAvailableMenuItems([]);
    }
  }, [user]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Unauthenticated: Render children directly (for auth pages)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Determine navigation items and theme
  const activeNavigationItems = isUserSuperAdmin ? superAdminNavigationItems : navigationItems;
  const sidebarGradient = isUserSuperAdmin
    ? 'bg-gradient-to-b from-purple-900 to-indigo-900'
    : 'bg-[#133830]';
  const borderColor = isUserSuperAdmin ? 'border-purple-700/20' : 'border-[#B1F1E3]/20';

  // Authenticated: Render full layout with sidebar
  return (
    <TooltipProvider>
      <div className="w-full min-h-screen bg-slate-50">
        <style>{`
            /* Hide number input arrows */
            input[type=number]::-webkit-inner-spin-button,
            input[type=number]::-webkit-outer-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
            input[type=number] {
              -moz-appearance: textfield;
            }
          `}</style>

        {/* Mobile-only backdrop */}
        {isMobileMenuOpen &&
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        }

        {/* Sidebar */}
        <div
          className={`
              fixed top-0 left-0 h-screen z-50
              flex flex-col
              border-r border-slate-200 ${sidebarGradient} shadow-lg
              transition-all duration-300 ease-in-out

              ${isCollapsed ? 'w-[72px]' : 'w-[260px]'}

              md:translate-x-0
              ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
            `}>

          {/* Header */}
          <div className="p-6 flex justify-center relative">
            {/* Centered border with limited width */}
            <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[85%] border-b ${borderColor}`}></div>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                {/* <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 ring-1 ring-white/20"> */}
                  {isUserSuperAdmin ? (
                    <img src={logo} alt="Logo" />
                  ) : (
                    <img src={logo} alt="Logo" />
                  )}
                {/* </div> */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0' : 'w-auto delay-100'}`}>
                  <h2 className="font-bold text-white text-lg whitespace-nowrap">
                    {/* {isUserSuperAdmin ? 'ServeMax Admin' : 'ServeMax'} */}
                    <img src={logo1} alt="Logo" />
                  </h2>
                  <p className={`text-xs font-medium whitespace-nowrap ${isUserSuperAdmin ? 'text-purple-200' : 'text-blue-200'}`}>
                    {/* {isUserSuperAdmin ? 'Platform Administration' : 'Process Serving CRM'} */}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-white/10" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="p-3 flex-1 overflow-y-auto">
            <div>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'h-0' : 'h-auto'}`}>
                <div className={`text-xs font-semibold uppercase tracking-wider px-3 py-4 transition-opacity duration-300 ${isUserSuperAdmin ? 'text-purple-200' : 'text-[#FFFFFF]'}`}>
                  MAIN MENU
                </div>
              </div>
              <div>
                <nav className="space-y-1">
                  {activeNavigationItems
                    .filter(item => availableMenuItems.includes(item.title))
                    .map((item) => {
                      const menuButton = (
                        <NavLink
                          key={item.url}
                          to={item.url}
                          end={item.title !== 'Jobs'}
                          className={({ isActive }) => {
                            // Smart matching: Highlight "Jobs" for job-related pages
                            const isJobsRelated = item.title === 'Jobs' &&
                              (location.pathname.includes('/Jobs') ||
                                location.pathname.includes('/CreateJob') ||
                                location.pathname.includes('/jobs'));
                            const shouldHighlight = isActive || isJobsRelated;

                            return `group flex items-center px-3 py-3 rounded-xl mb-1 hover:bg-white/10 transition-all duration-200 ${isCollapsed ? 'justify-center' : ''
                              } ${shouldHighlight ? 'bg-white/15 shadow-sm ring-1 ring-white/20 backdrop-blur-sm border-r-2 border-[#49F0D1]' : ''}`;
                          }}
                        >
                          {({ isActive }) => {
                            // Smart matching: Highlight "Jobs" for job-related pages
                            const isJobsRelated = item.title === 'Jobs' &&
                              (location.pathname.includes('/Jobs') ||
                                location.pathname.includes('/CreateJob') ||
                                location.pathname.includes('/jobs'));
                            const shouldHighlight = isActive || isJobsRelated;
                            const textColor = isUserSuperAdmin ? 'text-purple-100' : 'text-blue-100';

                            return (
                              <>
                                <item.icon
                                  className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${shouldHighlight ? 'text-[#49F0D1]' : `${textColor} group-hover:text-white`
                                    }`}
                                />
                                <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0' : 'w-auto ml-3 delay-100'} ${shouldHighlight ? 'text-[#49F0D1]' : `${textColor} group-hover:text-white`}`}>
                                  {item.title}
                                </span>
                              </>
                            );
                          }}
                        </NavLink>
                      );

                      return isCollapsed ? (
                        <Tooltip key={item.url}>
                          <TooltipTrigger asChild>
                            {menuButton}
                          </TooltipTrigger>
                          <TooltipContent side="right" className="ml-2">
                            <p>{item.title}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        menuButton
                      );
                    })}
                </nav>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-0 relative">
            {/* Centered border with limited width */}
            <div className={`absolute top-0 left-1/2 transform -translate-x-1/2 w-[85%] border-t ${borderColor}`}></div>
            {/* User Profile Section */}
            <div className="p-4">
              {user &&
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                  {!isCollapsed ?
                    <>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-white/20">
                          <span className="text-white font-semibold text-sm">
                            {(user.first_name?.trim()?.charAt(0) || user.full_name?.trim()?.charAt(0) || 'U').toUpperCase()}
                          </span>
                        </div>
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0' : 'w-auto delay-100'}`}>
                          <p className="font-medium text-white text-sm truncate whitespace-nowrap">
                            {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User'}
                          </p>
                          <p className={`text-xs truncate whitespace-nowrap capitalize ${isUserSuperAdmin ? 'text-purple-200' : 'text-blue-200'}`}>
                            {isUserSuperAdmin ? 'Super Admin' :
                              user.user_type === 'company_owner' ? 'Company Owner' :
                                user.employee_role ? user.employee_role.replace('_', ' ') :
                                  user.user_type ? user.user_type.replace('_', ' ') : 'Member'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLogout}
                        className={`hover:text-white hover:bg-white/10 ${isUserSuperAdmin ? 'text-purple-200' : 'text-blue-200'}`}>
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </> :

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleLogout}
                          className={`hover:text-white hover:bg-white/10 ${isUserSuperAdmin ? 'text-purple-200' : 'text-blue-200'}`}>
                          <LogOut className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="ml-2">
                        <p>Logout {user.full_name || 'User'}</p>
                      </TooltipContent>
                    </Tooltip>
                  }
                </div>
              }
            </div>

            {/* Collapse Button Section - Hidden on mobile */}
            <div className="p-2 hidden md:block relative">
              {/* Centered border with limited width */}
              <div className={`absolute top-0 left-1/2 transform -translate-x-1/2 w-[85%] border-t ${borderColor}`}></div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={() => setIsCollapsed((prev) => !prev)}
                    className={`w-full hover:bg-white/10 hover:text-white flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} ${isUserSuperAdmin ? 'text-purple-200' : 'text-blue-200'}`}>
                    <ChevronLeft className={`w-4 h-4 transition-transform duration-300 flex-shrink-0 ${isCollapsed ? 'rotate-180' : 'rotate-0'}`} />
                    <span className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0' : 'w-auto ml-3 delay-100'}`}>Collapse</span>
                  </Button>
                </TooltipTrigger>
                {isCollapsed &&
                  <TooltipContent side="right" className="ml-2">
                    <p>Expand</p>
                  </TooltipContent>
                }
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'}`}>
          {/* Mobile Header */}
          <header className="bg-white border-b border-slate-200 px-4 py-3 md:hidden sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200"
                onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="w-5 h-5 text-slate-600" />
              </Button>
              <h1 className="text-lg font-bold text-slate-900">ServeMax</h1>
            </div>
          </header>

          {/* Page Content - Individual pages handle their own loading */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
