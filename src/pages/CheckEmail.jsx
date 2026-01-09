import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, RefreshCw, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { FirebaseFunctions } from '@/firebase/functions';
import { createPageUrl } from '@/utils';
import PublicNavbar from '@/components/layout/PublicNavbar';

export default function CheckEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState('');

  // Get email from location state or current user
  const email = location.state?.email || user?.email || '';
  const userName = location.state?.userName || user?.full_name || '';

  const handleResendEmail = async () => {
    if (!user?.uid || !email) {
      setError('Unable to resend email. Please try signing up again.');
      return;
    }

    setIsResending(true);
    setError('');
    setResendSuccess(false);

    try {
      await FirebaseFunctions.resendVerificationEmail(user.uid, email, userName);
      setResendSuccess(true);
    } catch (err) {
      console.error('Resend verification email error:', err);
      setError('Failed to resend verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <PublicNavbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-white flex items-center justify-center p-4 pt-24">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="shadow-2xl border-slate-200/50 backdrop-blur-sm bg-white/95">
            <CardHeader className="text-center space-y-4 pb-2">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Check Your Email</CardTitle>
              <CardDescription className="text-base">
                We've sent a verification link to
                {email && (
                  <span className="block font-semibold text-slate-800 mt-1">
                    {email}
                  </span>
                )}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Next Steps:</h4>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li>Open your email inbox</li>
                  <li>Find the email from ServeMax</li>
                  <li>Click the verification link</li>
                  <li>Sign in to your account</li>
                </ol>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {resendSuccess && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Verification email sent! Check your inbox.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleResendEmail}
                  disabled={isResending || !user?.uid}
                  className="w-full h-11"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Resend Verification Email
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => navigate(createPageUrl('Login'))}
                  className="w-full h-11 text-slate-600"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </div>

              <p className="text-center text-sm text-slate-500 pt-4">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={handleResendEmail}
                  disabled={isResending || !user?.uid}
                  className="text-blue-600 hover:underline disabled:opacity-50"
                >
                  click here to resend
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
