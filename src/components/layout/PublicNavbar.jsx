import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function PublicNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isLoginPage = location.pathname.includes('/login');
  const isSignUpPage = location.pathname.includes('/signup') || location.pathname.includes('/sign-up');

  const handleLogoClick = () => {
    navigate(createPageUrl('Home'));
  };

  const handleLogin = () => {
    navigate(createPageUrl('Login'));
  };

  const handleSignUp = () => {
    navigate(createPageUrl('SignUp'));
  };

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-300 ease-in-out
        ${scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg'
          : 'bg-white/80 backdrop-blur-sm'
        }
        border-b border-slate-200/50
        animate-in fade-in slide-in-from-top-4 duration-500
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-3 group transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg px-2 py-1"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-800 to-blue-900 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-xl transition-shadow duration-200">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
              ServeMax
            </span>
          </button>

          {/* Navigation Actions */}
          <div className="flex items-center gap-3">
            {!isLoginPage && (
              <Button
                variant="ghost"
                onClick={handleLogin}
                className="hidden sm:inline-flex hover:bg-slate-100 transition-colors duration-200"
              >
                Login
              </Button>
            )}
            {!isSignUpPage && (
              <Button
                onClick={handleSignUp}
                className="bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-900 hover:to-blue-950 text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Start Free Trial
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
