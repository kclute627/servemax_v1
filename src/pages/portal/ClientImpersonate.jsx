import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, Building2, AlertCircle, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/firebase/config";
import { entities } from "@/firebase/database";

export default function ClientImpersonate() {
  const { companySlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const clientEmail = searchParams.get('email');

  const [status, setStatus] = useState('processing'); // processing, error
  const [message, setMessage] = useState('Signing in...');
  const [companyData, setCompanyData] = useState(null);

  // Load company data
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
            branding: company.branding || {}
          });
        }
      } catch (err) {
        console.error('Error loading company:', err);
      }
    };
    loadCompany();
  }, [companySlug]);

  // Process impersonation token
  useEffect(() => {
    const processImpersonation = async () => {
      if (!token) {
        setStatus('error');
        setMessage('No impersonation token provided.');
        return;
      }

      try {
        setMessage('Authenticating...');

        // Sign in with the custom token
        await signInWithCustomToken(auth, token);

        // Set impersonation mode flag in sessionStorage
        sessionStorage.setItem('impersonation_mode', 'true');
        sessionStorage.setItem('impersonation_email', clientEmail || '');

        setMessage('Redirecting to portal...');

        // Short delay to let auth state propagate
        await new Promise(resolve => setTimeout(resolve, 500));

        // Redirect to dashboard
        navigate(`/portal/${companySlug}/dashboard`, { replace: true });

      } catch (err) {
        console.error('Error processing impersonation:', err);
        setStatus('error');

        if (err.code === 'auth/invalid-custom-token') {
          setMessage('Invalid or expired impersonation token. Please try again from the admin dashboard.');
        } else if (err.code === 'auth/custom-token-mismatch') {
          setMessage('Token mismatch. The impersonation token is not valid for this project.');
        } else {
          setMessage(err.message || 'Failed to authenticate. Please try again.');
        }
      }
    };

    processImpersonation();
  }, [token, clientEmail, companySlug, navigate]);

  const primaryColor = companyData?.branding?.primary_color || '#1e40af';

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
                {companyData?.name && (
                  <span className="text-2xl font-bold text-slate-900">
                    {companyData.name}
                  </span>
                )}
              </div>
            )}
          </div>

          <CardTitle className="text-xl flex items-center justify-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Admin View Mode
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center">
          {status === 'processing' && (
            <div className="py-8">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
              <p className="text-slate-600">{message}</p>
              {clientEmail && (
                <p className="text-sm text-slate-500 mt-2">
                  Viewing as: {clientEmail}
                </p>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <Alert variant="destructive" className="text-left">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <p className="text-sm text-slate-500 mt-4">
                Please close this tab and try again from the client details page.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
