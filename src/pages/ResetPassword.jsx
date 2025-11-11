import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, FileText, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { FirebaseAuth } from '@/firebase/auth';
import { createPageUrl } from '@/utils';
import PublicNavbar from '@/components/layout/PublicNavbar';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [invalidCode, setInvalidCode] = useState(false);

  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    if (!oobCode) {
      setInvalidCode(true);
    }
  }, [oobCode]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.password) {
      setError('Password is required');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!oobCode) {
      setError('Invalid reset code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await FirebaseAuth.confirmPasswordReset(oobCode, formData.password);
      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate(createPageUrl('Login'), { replace: true });
      }, 3000);
    } catch (err) {
      console.error('Password reset error:', err);

      if (err.message.includes('expired-action-code')) {
        setError('This password reset link has expired. Please request a new one.');
      } else if (err.message.includes('invalid-action-code')) {
        setError('This password reset link is invalid. Please request a new one.');
      } else if (err.message.includes('weak-password')) {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError('Failed to reset password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (invalidCode) {
    return (
      <>
        <PublicNavbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-white flex items-center justify-center p-4 pt-24">
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent mb-2">
                Invalid Link
              </h1>
              <p className="text-slate-600">Password reset link is invalid or expired</p>
            </div>

            <Card className="shadow-2xl border-slate-200/50 backdrop-blur-sm bg-white/95">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <CardTitle>Invalid Reset Link</CardTitle>
                    <CardDescription>This link cannot be used</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The password reset link you used is invalid or has expired. Please request a new password reset.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Link to={createPageUrl('ForgotPassword')} className="block">
                    <Button className="w-full bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-900 hover:to-blue-950 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                      Request New Reset Link
                    </Button>
                  </Link>

                  <Link to={createPageUrl('Login')} className="block">
                    <Button variant="ghost" className="w-full">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  if (success) {
    return (
      <>
        <PublicNavbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-white flex items-center justify-center p-4 pt-24">
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent mb-2">
                Password Updated
              </h1>
              <p className="text-slate-600">Your password has been reset successfully</p>
            </div>

            <Card className="shadow-2xl border-slate-200/50 backdrop-blur-sm bg-white/95">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle>Success!</CardTitle>
                    <CardDescription>You're ready to sign in</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Your password has been updated successfully. You can now sign in with your new password.
                  </AlertDescription>
                </Alert>

                <p className="text-sm text-slate-600">
                  You will be redirected to the login page automatically, or you can click the button below.
                </p>

                <Link to={createPageUrl('Login')} className="block">
                  <Button className="w-full bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-900 hover:to-blue-950 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                    Continue to Login
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PublicNavbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-white flex items-center justify-center p-4 pt-24">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent mb-2">
              Reset Password
            </h1>
            <p className="text-slate-600">Create your new password</p>
          </div>

          <Card className="shadow-2xl border-slate-200/50 backdrop-blur-sm bg-white/95">
            <CardHeader>
              <CardTitle>Create New Password</CardTitle>
              <CardDescription>
                Enter your new password below (at least 6 characters)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 font-medium">New Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 6 characters"
                      className="pl-10 h-11 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">Confirm New Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your new password"
                      className="pl-10 h-11 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-900 hover:to-blue-950 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating Password...' : 'Update Password'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to={createPageUrl('Login')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-2 hover:underline transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}