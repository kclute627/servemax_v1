

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
  HandCoins, // Added new icon
  Settings // Add Settings import
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { User } from "@/api/entities";

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
    title: "Invoicing",
    url: createPageUrl("Invoicing"),
    icon: Receipt
  },
  {
    title: "Payments",
    url: createPageUrl("Payments"),
    icon: CreditCard
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

export default function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Persist collapse state in localStorage
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true"
  );

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", isCollapsed);
  }, [isCollapsed]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        console.log("User not authenticated");
      }
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    await User.logout();
    window.location.reload();
  };

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
            border-r border-slate-200 bg-white shadow-sm
            transition-all duration-300 ease-in-out
            
            ${isCollapsed ? 'w-[72px]' : 'w-[240px]'}
            
            md:translate-x-0
            ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          `}>

          {/* Header */}
          <div className="border-b border-slate-200 p-6 flex justify-center">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0' : 'w-auto ml-3 delay-100'}`}>
                    <h2 className="font-bold text-slate-900 text-lg whitespace-nowrap">ServeMax</h2>
                    <p className="text-xs text-slate-500 font-medium whitespace-nowrap">Process Serving CRM</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="p-2 flex-1 overflow-y-auto">
            <div>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'h-0' : 'h-auto'}`}>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-3 transition-opacity duration-300">
                  Navigation
                </div>
              </div>
              <div>
                <nav>
                  {navigationItems.map((item) => {
                    const menuButton = (
                      <NavLink
                        key={item.url}
                        to={item.url}
                        end
                        className={({ isActive }) =>
                          `group flex items-center px-3 py-3 rounded-lg mb-1 hover:bg-slate-100 transition-all duration-200 ${
                            isCollapsed ? 'justify-center' : ''
                          } ${isActive ? 'bg-slate-900 shadow-sm' : ''}`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <item.icon
                              className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${
                                isActive ? 'text-white' : 'text-slate-700 group-hover:text-slate-900'
                              }`}
                            />
                            <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0' : 'w-auto ml-3 delay-100'} ${isActive ? 'text-white' : 'text-slate-700 group-hover:text-slate-900'}`}>
                              {item.title}
                            </span>
                          </>
                        )}
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
          <div className="p-0 border-t border-slate-200">
            {/* User Profile Section */}
            <div className="p-4">
              {user &&
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                  {!isCollapsed ?
                    <>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-semibold text-sm">
                            {(user.full_name?.trim()?.charAt(0) || 'U').toUpperCase()}
                          </span>
                        </div>
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0' : 'w-auto delay-100'}`}>
                          <p className="font-medium text-slate-900 text-sm truncate whitespace-nowrap">
                            {user.full_name || 'User'}
                          </p>
                          <p className="text-xs text-slate-500 truncate whitespace-nowrap capitalize">
                            {user.role || 'Member'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLogout}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </> :

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleLogout}
                          className="text-slate-400 hover:text-slate-600 hover:bg-slate-100">
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
            <div className="border-t border-slate-200 p-2 hidden md:block">
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button
                    variant="ghost"
                    onClick={() => setIsCollapsed((prev) => !prev)}
                    className={`w-full hover:bg-slate-100 text-slate-600 flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
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
        <main className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'md:ml-[72px]' : 'md:ml-[240px]'}`}>
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
          
          {/* Page Content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

