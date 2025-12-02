import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Building2, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useClientAuth } from "@/components/auth/ClientAuthProvider";
import { entities } from "@/firebase/database";

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

          <CardTitle className="text-xl">Client Portal Login</CardTitle>
          <CardDescription>
            {companyData?.portalSettings?.welcome_message ||
              "Sign in to view your jobs and invoices"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              style={{ backgroundColor: primaryColor }}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            <p>
              Don't have an account? Contact{" "}
              <span className="font-medium text-slate-700">
                {companyData?.name || 'the company'}
              </span>{" "}
              to request access.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
