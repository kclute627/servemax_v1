import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import logoFullWhite from '@/images/logo-full-white.png';

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

  const isLoginPage = location.pathname.includes('/login') || location.pathname.includes('/Login');
  const isSignUpPage = location.pathname.includes('/signup') || location.pathname.includes('/sign-up') || location.pathname.includes('/SignUp');

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
          ? 'bg-[#0D2E26]/95 backdrop-blur-xl shadow-md'
          : 'bg-[#0D2E26]/90 backdrop-blur-sm'
        }
        border-b border-white/10
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <button
            onClick={handleLogoClick}
            className="focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#0D2E26] rounded-lg"
          >
            <img src={logoFullWhite} alt="Diligence" className="h-10" />
          </button>

          {/* Navigation Actions */}
          <div className="flex items-center gap-3">
            {!isLoginPage && (
              <Button
                variant="ghost"
                onClick={handleLogin}
                className="hidden sm:inline-flex text-gray-300 hover:text-white hover:bg-white/10 transition-colors duration-200"
              >
                Sign in
              </Button>
            )}
            {!isSignUpPage && (
              <Button
                onClick={handleSignUp}
                className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-full px-5 transition-all duration-200"
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
