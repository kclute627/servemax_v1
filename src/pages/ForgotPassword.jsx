import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { FirebaseAuth } from '@/firebase/auth';
import { createPageUrl } from '@/utils';
import PublicNavbar from '@/components/layout/PublicNavbar';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await FirebaseAuth.sendPasswordResetEmail(email);
      setSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);

      if (err.message.includes('user-not-found')) {
        setError('No account found with this email address.');
      } else if (err.message.includes('invalid-email')) {
        setError('Please enter a valid email address.');
      } else if (err.message.includes('too-many-requests')) {
        setError('Too many requests. Please try again later.');
      } else {
        setError('Failed to send password reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <PublicNavbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-white flex items-center justify-center p-4 pt-24">
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent mb-2">
                Check Your Email
              </h1>
              <p className="text-slate-600">Password reset email sent</p>
            </div>

            <Card className="shadow-2xl border-slate-200/50 backdrop-blur-sm bg-white/95">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>Check Your Email</CardTitle>
                  <CardDescription>We've sent you a password reset link</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  We've sent a password reset link to <strong>{email}</strong>
                </AlertDescription>
              </Alert>

              <div className="space-y-3 text-sm text-slate-600">
                <p>Please check your email and click the link to reset your password. The link will expire in 1 hour.</p>
                <p>Don't see the email? Check your spam folder.</p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full"
                >
                  Send Another Email
                </Button>

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
            <p className="text-slate-600">We'll send you a reset link</p>
          </div>

          <Card className="shadow-2xl border-slate-200/50 backdrop-blur-sm bg-white/95">
          <CardHeader>
            <CardTitle>Forgot Password?</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password
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
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
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
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to={createPageUrl('Login')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Additional Help */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 mb-3">
            Remember your password?
          </p>
          <Link
            to={createPageUrl('Login')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  </>
  );
}