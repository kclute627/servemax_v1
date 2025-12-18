import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/components/auth/AuthProvider";
import { useGlobalData } from "@/components/GlobalDataContext";
import { useToast } from "@/components/ui/use-toast";
import { CompanyManager } from "@/firebase/schemas";
import { entities } from "@/firebase/database";
import { Globe, Save, ExternalLink, UserPlus, Loader2, Link, Copy, Check } from "lucide-react";

export default function PortalSettingsPanel() {
  const { user } = useAuth();
  const { companyData, refreshData } = useGlobalData();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [portalSettings, setPortalSettings] = useState({
    portal_enabled: false,
    portal_slug: '',
    welcome_message: '',
    allow_self_registration: false
  });

  // Generate random 7-digit portal slug
  const generateRandomSlug = () => {
    // Generate random 7-digit number (1000000 - 9999999)
    return String(Math.floor(1000000 + Math.random() * 9000000));
  };

  // Load settings from company data and auto-generate slug if needed
  useEffect(() => {
    if (companyData) {
      const existingSlug = companyData.portal_settings?.portal_slug;
      // Use existing slug or generate a new random one (will be validated for uniqueness on save)
      const generatedSlug = existingSlug || generateRandomSlug();

      setPortalSettings({
        portal_enabled: companyData.portal_settings?.portal_enabled || false,
        portal_slug: generatedSlug,
        welcome_message: companyData.portal_settings?.welcome_message || '',
        allow_self_registration: companyData.portal_settings?.allow_self_registration || false
      });
    }
  }, [companyData]);

  const handleInputChange = (field, value) => {
    setPortalSettings(prev => ({ ...prev, [field]: value }));
  };

  // Check if slug is unique
  const checkSlugAvailability = async (slug) => {
    try {
      const allCompanies = await entities.Company.list();
      const duplicate = allCompanies.find(
        c => c.portal_settings?.portal_slug === slug && c.id !== user.company_id
      );
      return !duplicate;
    } catch (error) {
      console.error("Error checking slug availability:", error);
      return false;
    }
  };

  // Generate unique slug - keep trying random numbers until we find one that's available
  const ensureUniqueSlug = async (initialSlug) => {
    let slug = initialSlug;
    let attempts = 0;
    const maxAttempts = 10;

    while (!(await checkSlugAvailability(slug))) {
      slug = generateRandomSlug();
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error("Could not generate unique portal slug after multiple attempts");
      }
    }

    return slug;
  };

  const copyToClipboard = (url, type) => {
    navigator.clipboard.writeText(url);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const saveSettings = async () => {
    if (!user?.company_id) return;

    setIsLoading(true);
    try {
      // Ensure slug is unique before saving
      let finalSlug = portalSettings.portal_slug;

      // If enabling portal for the first time, check/fix slug uniqueness
      if (portalSettings.portal_enabled && !companyData.portal_settings?.portal_slug) {
        finalSlug = await ensureUniqueSlug(portalSettings.portal_slug);
      }

      await CompanyManager.updateCompany(user.company_id, {
        portal_settings: {
          portal_enabled: portalSettings.portal_enabled,
          portal_slug: finalSlug,
          welcome_message: portalSettings.welcome_message,
          allow_self_registration: portalSettings.allow_self_registration
        },
        updated_at: new Date()
      });

      await refreshData();

      toast({
        variant: "success",
        title: "Settings Saved",
        description: "Portal settings have been updated successfully."
      });
    } catch (error) {
      console.error("Error saving portal settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const portalUrl = portalSettings.portal_slug
    ? `https://www.servemax.pro/portal/${portalSettings.portal_slug}`
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Client Portal</CardTitle>
              <CardDescription>
                Configure your client portal where clients can view jobs, invoices, and submit new requests.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Portal Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="space-y-0.5">
              <div className="text-base font-medium">Enable Client Portal</div>
              <p className="text-sm text-slate-500">
                Allow your clients to access their own portal to view jobs and invoices.
              </p>
            </div>
            <Switch
              checked={portalSettings.portal_enabled}
              onCheckedChange={(checked) => handleInputChange('portal_enabled', checked)}
            />
          </div>

          {/* Portal URLs */}
          {portalUrl && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
              <Label className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                Your Portal URLs
              </Label>

              {/* Login URL */}
              <div className="flex items-center justify-between gap-2 p-3 bg-white rounded-lg border">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 mb-1">Client Login</p>
                  <a
                    href={`${portalUrl}/login`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1 truncate"
                  >
                    {portalUrl}/login
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(`${portalUrl}/login`, 'login')}
                  className="flex-shrink-0"
                >
                  {copied === 'login' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Signup URL */}
              {portalSettings.allow_self_registration && (
                <div className="flex items-center justify-between gap-2 p-3 bg-white rounded-lg border border-emerald-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 mb-1">Client Self-Registration</p>
                    <a
                      href={`${portalUrl}/signup`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-emerald-600 hover:underline flex items-center gap-1 truncate"
                    >
                      {portalUrl}/signup
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(`${portalUrl}/signup`, 'signup')}
                    className="flex-shrink-0"
                  >
                    {copied === 'signup' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Welcome Message */}
          <div className="space-y-2">
            <Label htmlFor="welcome_message">Welcome Message</Label>
            <Textarea
              id="welcome_message"
              value={portalSettings.welcome_message}
              onChange={(e) => handleInputChange('welcome_message', e.target.value)}
              placeholder="Sign in to view your jobs and invoices"
              rows={3}
            />
            <p className="text-xs text-slate-500">
              This message appears on the login page for your clients.
            </p>
          </div>

          {/* Self Registration */}
          <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <div className="flex items-start gap-3">
              <UserPlus className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-base font-medium text-emerald-900">Allow Client Self-Registration</div>
                <p className="text-sm text-emerald-700">
                  Let new clients create their own accounts. You'll be notified when someone registers.
                </p>
              </div>
            </div>
            <Switch
              checked={portalSettings.allow_self_registration}
              onCheckedChange={(checked) => handleInputChange('allow_self_registration', checked)}
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={saveSettings} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
