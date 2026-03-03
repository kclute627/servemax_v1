import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { createPageUrl } from '@/utils';
import PublicNavbar from '@/components/layout/PublicNavbar';
import logoFullWhite from '@/images/logo-full-white.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!formData.password) {
      setError('Password is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
      navigate(createPageUrl('Dashboard'), { replace: true });
    } catch (err) {
      console.error('Login error:', err);

      if (err.message.includes('user-not-found')) {
        setError('No account found with this email address.');
      } else if (err.message.includes('wrong-password')) {
        setError('Incorrect password. Please try again.');
      } else if (err.message.includes('invalid-email')) {
        setError('Please enter a valid email address.');
      } else if (err.message.includes('too-many-requests')) {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-display { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
      `}</style>

      <PublicNavbar />

      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 pt-24">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-emerald-100/40 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-100/30 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        </div>

        <div className="w-full max-w-md relative">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-[#0D2E26] rounded-2xl px-6 py-4 mb-6">
              <img src={logoFullWhite} alt="Diligence" className="h-12" />
            </div>
            <h1 className="text-3xl font-bold text-stone-900 mb-2">
              Welcome back
            </h1>
            <p className="text-stone-600">Sign in to your Diligence account</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-200/50 p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-stone-700 font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    className="pl-10 h-12 bg-stone-50 border-stone-200 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-stone-700 font-medium">Password</Label>
                  <Link
                    to={createPageUrl('ForgotPassword')}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    className="pl-10 h-12 bg-stone-50 border-stone-200 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#0D2E26] hover:bg-[#134035] text-white rounded-xl font-medium transition-all hover:scale-[1.01]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign in
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-stone-100">
              <p className="text-center text-stone-600">
                Don't have an account?{' '}
                <Link
                  to={createPageUrl('SignUp')}
                  className="text-emerald-600 hover:text-emerald-700 font-semibold"
                >
                  Start free trial
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link
                to={createPageUrl('InviteSignUp')}
                className="text-sm text-stone-500 hover:text-stone-700"
              >
                Have an invitation? Join a company →
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 text-center">
            <p className="text-sm text-stone-500 mb-4">
              Process serving made simple
            </p>
            <div className="flex justify-center gap-6 text-xs text-stone-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                Job Management
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                Auto Documents
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                Invoicing
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
