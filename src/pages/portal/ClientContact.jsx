import React from "react";
import { useParams } from "react-router-dom";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Globe,
  Building2,
  MessageCircle,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientAuth } from "@/components/auth/ClientAuthProvider";

export default function ClientContact() {
  const { companySlug } = useParams();
  const { portalData } = useClientAuth();

  const company = portalData?.company || {};
  const branding = portalData?.branding || {};
  const primaryColor = branding.primary_color || '#0f172a';

  // Format phone number for display
  const formatPhone = (phone) => {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Build full address
  const getFullAddress = () => {
    const parts = [
      company.address,
      company.city,
      company.state && company.zip ? `${company.state} ${company.zip}` : company.state || company.zip
    ].filter(Boolean);
    return parts.join(', ');
  };

  const fullAddress = getFullAddress();

  // Contact methods
  const contactMethods = [
    {
      icon: Phone,
      label: "Phone",
      value: formatPhone(company.phone),
      href: company.phone ? `tel:${company.phone.replace(/\D/g, '')}` : null,
      action: "Call Now"
    },
    {
      icon: Mail,
      label: "Email",
      value: company.email,
      href: company.email ? `mailto:${company.email}` : null,
      action: "Send Email"
    },
    {
      icon: MapPin,
      label: "Address",
      value: fullAddress || null,
      href: fullAddress ? `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}` : null,
      action: "Get Directions",
      external: true
    },
    {
      icon: Globe,
      label: "Website",
      value: company.website,
      href: company.website ? (company.website.startsWith('http') ? company.website : `https://${company.website}`) : null,
      action: "Visit Website",
      external: true
    }
  ].filter(method => method.value);

  // Business hours (if available)
  const businessHours = company.business_hours || portalData?.portalSettings?.business_hours;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contact</h1>
        <p className="text-slate-500 mt-1">Get in touch with {company.name || 'us'}</p>
      </div>

      {/* Company Card */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {/* Company Header */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
          <div className="flex items-center gap-4">
            {branding.logo_url ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <img
                  src={branding.logo_url}
                  alt={company.name}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {company.name?.charAt(0) || 'C'}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-900">{company.name || 'Company'}</h2>
              {company.tagline && (
                <p className="text-slate-500 text-sm mt-0.5">{company.tagline}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Methods */}
        <div className="divide-y divide-slate-100">
          {contactMethods.map((method, index) => (
            <div key={index} className="p-5 flex items-center gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${primaryColor}10` }}
              >
                <method.icon className="w-5 h-5" style={{ color: primaryColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">
                  {method.label}
                </p>
                <p className="text-slate-900 font-medium truncate">{method.value}</p>
              </div>
              {method.href && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg shrink-0"
                  onClick={() => window.open(method.href, method.external ? '_blank' : '_self')}
                >
                  {method.action}
                  {method.external && <ExternalLink className="w-3.5 h-3.5 ml-1.5" />}
                </Button>
              )}
            </div>
          ))}

          {contactMethods.length === 0 && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-slate-500">
                Contact information has not been configured yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Business Hours (if available) */}
      {businessHours && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}10` }}
              >
                <Clock className="w-4 h-4" style={{ color: primaryColor }} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Business Hours</h3>
                <p className="text-sm text-slate-500">When we're available</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <p className="text-slate-700 whitespace-pre-line">{businessHours}</p>
          </div>
        </div>
      )}

      {/* Quick Contact CTA */}
      {(company.phone || company.email) && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-center">
          <MessageCircle className="w-10 h-10 text-white/80 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Need Assistance?</h3>
          <p className="text-slate-300 text-sm mb-5">
            Our team is here to help with any questions about your orders or services.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {company.phone && (
              <Button
                className="text-white gap-2"
                style={{ backgroundColor: primaryColor }}
                onClick={() => window.open(`tel:${company.phone.replace(/\D/g, '')}`, '_self')}
              >
                <Phone className="w-4 h-4" />
                Call Us
              </Button>
            )}
            {company.email && (
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-2"
                onClick={() => window.open(`mailto:${company.email}`, '_self')}
              >
                <Mail className="w-4 h-4" />
                Email Us
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
