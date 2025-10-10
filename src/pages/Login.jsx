import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Mail, Lock, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { createPageUrl } from '@/utils';

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
      // Redirect will be handled by the ProtectedRoute component
      navigate(createPageUrl('Dashboard'), { replace: true });
    } catch (err) {
      console.error('Login error:', err);

      // Provide user-friendly error messages
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">ServeMax</h1>
          </div>
          <p className="text-slate-600">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Your password"
                    className="pl-10"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            {/* Forgot Password Link */}
            <div className="text-center mt-4">
              <Link
                to={createPageUrl('ForgotPassword')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Forgot your password?
              </Link>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <div className="text-center text-sm text-slate-600">
                Don't have an account?{' '}
                <Link
                  to={createPageUrl('SignUp')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Start your free trial
                </Link>
              </div>

              <div className="text-center text-sm text-slate-600">
                Have an invitation?{' '}
                <Link
                  to={createPageUrl('InviteSignUp')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Join a company
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features reminder */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 mb-3">
            Process serving made simple with ServeMax
          </p>
          <div className="flex justify-center space-x-6 text-xs text-slate-400">
            <span>✓ Job Management</span>
            <span>✓ Client Portal</span>
            <span>✓ Automated Documents</span>
          </div>
        </div>
      </div>
    </div>
  );
}