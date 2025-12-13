import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Building2, Mail, ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { entities } from "@/firebase/database";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/firebase/config";

export default function ClientForgotPassword() {
  const { companySlug } = useParams();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [companyData, setCompanyData] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);

  // Load company branding
  useEffect(() => {
    const loadCompany = async () => {
      try {
        const allCompanies = await entities.Company.list();
        const company = allCompanies.find(
          c => c.portal_settings?.portal_slug === companySlug
        );

        if (company) {
          setCompanyData({
            name: company.name,
            branding: company.branding || {},
            portalSettings: company.portal_settings || {}
          });
        }
      } catch (err) {
        console.error('Error loading company:', err);
      } finally {
        setLoadingCompany(false);
      }
    };

    loadCompany();
  }, [companySlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Use Firebase Auth to send password reset email
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        // Don't reveal if user exists or not for security
        setSuccess(true);
      } else if (err.code === 'auth/invalid-email') {
        setError("Please enter a valid email address.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many requests. Please try again later.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const primaryColor = companyData?.branding?.primary_color || '#1e40af';

  if (loadingCompany) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* Company Logo or Name */}
          <div className="mb-4">
            {companyData?.branding?.logo_url ? (
              <img
                src={companyData.branding.logo_url}
                alt={companyData.name}
                className="h-16 max-w-[200px] mx-auto object-contain"
              />
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Building2 className="w-10 h-10" style={{ color: primaryColor }} />
                <span className="text-2xl font-bold text-slate-900">
                  {companyData?.name || 'Client Portal'}
                </span>
              </div>
            )}
          </div>

          <CardTitle className="text-xl">Reset Your Password</CardTitle>
          <CardDescription>
            {success
              ? "Check your email for reset instructions"
              : "Enter your email address and we'll send you a link to reset your password"
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
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
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                style={{ backgroundColor: primaryColor }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900">Check your inbox</p>
                    <p className="text-sm text-green-700 mt-1">
                      If an account exists with {email}, you'll receive a password reset link shortly.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                }}
              >
                Send another link
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              to={`/portal/${companySlug}/login`}
              className="text-sm text-slate-600 hover:text-slate-900 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
