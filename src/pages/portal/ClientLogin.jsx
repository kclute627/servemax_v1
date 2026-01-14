import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Building2, Eye, EyeOff, LogIn, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientAuth } from "@/components/auth/ClientAuthProvider";
import { FirebaseFunctions } from "@/firebase/functions";

export default function ClientLogin() {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authLoading } = useClientAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [companyData, setCompanyData] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);

  // Load company branding using public Cloud Function (no auth required)
  useEffect(() => {
    const loadCompany = async () => {
      try {
        const result = await FirebaseFunctions.getPortalInfo(companySlug);

        if (result.success && result.data) {
          setCompanyData({
            name: result.data.name,
            branding: result.data.branding || {},
            portalSettings: result.data.portalSettings || {}
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

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(`/portal/${companySlug}/dashboard`);
    }
  }, [authLoading, isAuthenticated, companySlug, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      navigate(`/portal/${companySlug}/dashboard`);
    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid email or password. Please try again.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError(err.message || "Failed to log in. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const primaryColor = companyData?.branding?.primary_color || '#0f172a';

  if (loadingCompany) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          {/* Header with Logo */}
          <div className="px-8 pt-10 pb-8 text-center">
            {companyData?.branding?.logo_url ? (
              <img
                src={companyData.branding.logo_url}
                alt={companyData.name}
                className="h-14 max-w-[180px] mx-auto object-contain mb-6"
              />
            ) : (
              <div className="flex items-center justify-center gap-3 mb-6">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-slate-900">
                  {companyData?.name || 'Portal'}
                </span>
              </div>
            )}

            <h1 className="text-2xl font-bold text-slate-900 mb-2">Sign in to {companyData?.name}</h1>
            <p className="text-slate-500">
              {companyData?.portalSettings?.welcome_message ||
                "Sign in to view your orders and invoices"}
            </p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Alert */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-rose-50 rounded-xl border border-rose-100">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-700">{error}</p>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-2">
                <Label className="text-slate-700">Email address</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-12 rounded-xl"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label className="text-slate-700">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-12 rounded-xl pr-12"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-white rounded-xl text-base font-medium shadow-lg shadow-slate-900/10"
                style={{ backgroundColor: primaryColor }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 bg-slate-50 border-t border-slate-100">
            <p className="text-sm text-slate-500 text-center">
              {companyData?.portalSettings?.allow_self_registration ? (
                <>
                  Don't have an account?{" "}
                  <Link
                    to={`/portal/${companySlug}/signup`}
                    className="font-medium hover:underline"
                    style={{ color: primaryColor }}
                  >
                    Create one
                  </Link>
                </>
              ) : (
                <>
                  Need access? Contact{" "}
                  <span className="font-medium text-slate-700">
                    {companyData?.name || 'the company'}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Bottom Text */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Secure client portal
        </p>
      </div>
    </div>
  );
}
