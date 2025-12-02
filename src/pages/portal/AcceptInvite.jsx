import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FirebaseFunctions } from "@/firebase/functions";
import { entities } from "@/firebase/database";

export default function AcceptInvite() {
  const { companySlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');

  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('');
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

  // Process invitation
  useEffect(() => {
    const processInvitation = async () => {
      if (!token) {
        setStatus('error');
        setMessage('No invitation token provided. Please check your invitation link.');
        return;
      }

      try {
        const result = await FirebaseFunctions.acceptClientInvitation(token);

        if (result.success) {
          setStatus('success');
          setMessage(result.message);
        } else {
          setStatus('error');
          setMessage(result.message || 'Failed to accept invitation.');
        }
      } catch (err) {
        console.error('Error accepting invitation:', err);
        setStatus('error');

        if (err.code === 'not-found') {
          setMessage('This invitation is invalid or has already been used.');
        } else {
          setMessage(err.message || 'Failed to accept invitation. Please try again.');
        }
      }
    };

    processInvitation();
  }, [token]);

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

          <CardTitle className="text-xl">Portal Invitation</CardTitle>
        </CardHeader>

        <CardContent className="text-center">
          {status === 'processing' && (
            <div className="py-8">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
              <p className="text-slate-600">Processing your invitation...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Invitation Accepted!
              </h3>
              <p className="text-slate-600 mb-6">{message}</p>
              <Button
                onClick={() => navigate(`/portal/${companySlug}/login`)}
                style={{ backgroundColor: primaryColor }}
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="py-8">
              <XCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Invitation Error
              </h3>
              <p className="text-slate-600 mb-6">{message}</p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate(`/portal/${companySlug}/login`)}
                  style={{ backgroundColor: primaryColor }}
                  className="w-full"
                >
                  Go to Login
                </Button>
                <p className="text-sm text-slate-500">
                  If you continue to have issues, please contact the company administrator.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
