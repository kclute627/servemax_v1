import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { FirebaseFunctions } from '@/firebase/functions';
import { createPageUrl } from '@/utils';
import PublicNavbar from '@/components/layout/PublicNavbar';
import { useAuth } from '@/components/auth/AuthProvider';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const { token } = useParams();
  const { refresh } = useAuth();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setErrorMessage('Invalid verification link.');
        return;
      }

      try {
        await FirebaseFunctions.verifyEmail(token);
        setStatus('success');
        // Refresh user data to get updated email_verified status
        try {
          await refresh();
        } catch (refreshError) {
          // User might not be logged in, that's ok
          console.log('Could not refresh user data:', refreshError);
        }
        // Auto-redirect to Dashboard after brief success message
        setTimeout(() => {
          navigate(createPageUrl('Dashboard'), { replace: true });
        }, 1500);
      } catch (error) {
        console.error('Email verification error:', error);
        setStatus('error');

        // Extract error message
        if (error.message?.includes('expired')) {
          setErrorMessage('This verification link has expired. Please request a new one.');
        } else if (error.message?.includes('already been used')) {
          setErrorMessage('This verification link has already been used.');
        } else if (error.message?.includes('not-found')) {
          setErrorMessage('Invalid verification link.');
        } else {
          setErrorMessage('Failed to verify email. Please try again.');
        }
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <>
      <PublicNavbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-white flex items-center justify-center p-4 pt-24">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="shadow-2xl border-slate-200/50 backdrop-blur-sm bg-white/95">
            <CardHeader className="text-center space-y-4 pb-2">
              {status === 'verifying' && (
                <>
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                  <CardTitle className="text-2xl">Verifying Your Email</CardTitle>
                  <CardDescription className="text-base">
                    Please wait while we verify your email address...
                  </CardDescription>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <CardTitle className="text-2xl text-green-700">Email Verified!</CardTitle>
                  <CardDescription className="text-base">
                    Your email has been successfully verified. You can now sign in to your account.
                  </CardDescription>
                </>
              )}

              {status === 'error' && (
                <>
                  <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <CardTitle className="text-2xl text-red-700">Verification Failed</CardTitle>
                  <CardDescription className="text-base text-red-600">
                    {errorMessage}
                  </CardDescription>
                </>
              )}
            </CardHeader>

            <CardContent className="pt-6">
              {status === 'success' && (
                <Button
                  onClick={() => navigate(createPageUrl('Login'), { replace: true })}
                  className="w-full h-12 bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-900 hover:to-blue-950"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Sign In to Your Account
                </Button>
              )}

              {status === 'error' && (
                <div className="space-y-3">
                  <Button
                    onClick={() => navigate(createPageUrl('Login'), { replace: true })}
                    className="w-full h-12 bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-900 hover:to-blue-950"
                  >
                    Go to Login
                  </Button>
                  <p className="text-center text-sm text-slate-600">
                    Need help?{' '}
                    <Link to={createPageUrl('SignUp')} className="text-blue-600 hover:underline">
                      Contact support
                    </Link>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
