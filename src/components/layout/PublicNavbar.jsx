import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
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
          ? 'bg-stone-50/95 backdrop-blur-xl shadow-sm'
          : 'bg-stone-50/80 backdrop-blur-sm'
        }
        border-b border-stone-200/50
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 group transition-transform duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-lg px-2 py-1"
          >
            <div className="w-8 h-8 bg-[#0D2E26] rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-xl font-bold text-[#0D2E26] tracking-tight">
              Diligence
            </span>
          </button>

          {/* Navigation Actions */}
          <div className="flex items-center gap-3">
            {!isLoginPage && (
              <Button
                variant="ghost"
                onClick={handleLogin}
                className="hidden sm:inline-flex text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors duration-200"
              >
                Sign in
              </Button>
            )}
            {!isSignUpPage && (
              <Button
                onClick={handleSignUp}
                className="bg-[#0D2E26] hover:bg-[#134035] text-white rounded-full px-5 transition-all duration-200"
              >
                Start free trial
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
