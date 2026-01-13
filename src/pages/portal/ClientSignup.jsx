import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Building2, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { FirebaseFunctions } from "@/firebase/functions";
import AddressAutocomplete from "@/components/jobs/AddressAutocomplete";

// Free email providers that we can't use for duplicate detection
const FREE_EMAIL_PROVIDERS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'aol.com', 'icloud.com', 'mail.com', 'protonmail.com',
  'live.com', 'msn.com', 'ymail.com'
];

export default function ClientSignup() {
  const { companySlug } = useParams();
  const navigate = useNavigate();

  // Form state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [companyData, setCompanyData] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [emailWarning, setEmailWarning] = useState("");

  // Form fields
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: ""
  });

  // Load company branding using public Cloud Function (no auth required)
  useEffect(() => {
    const loadCompany = async () => {
      try {
        const result = await FirebaseFunctions.getPortalInfo(companySlug);

        if (result.success && result.data) {
          setCompanyData({
            id: result.data.id,
            name: result.data.name,
            branding: result.data.branding || {},
            portalSettings: result.data.portalSettings || {}
          });

          // Check if self-registration is enabled
          if (!result.data.portalSettings?.allow_self_registration) {
            navigate(`/portal/${companySlug}/login`);
          }
        } else {
          navigate('/');
        }
      } catch (err) {
        console.error('Error loading company:', err);
        navigate('/');
      } finally {
        setLoadingCompany(false);
      }
    };

    loadCompany();
  }, [companySlug, navigate]);


  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");

    // Check email domain when email changes
    if (field === 'email' && value.includes('@')) {
      const domain = value.split('@')[1]?.toLowerCase();
      if (domain && FREE_EMAIL_PROVIDERS.includes(domain)) {
        setEmailWarning("We recommend using your company email for better account verification.");
      } else {
        setEmailWarning("");
      }
    }
  };

  const handleAddressSelect = (addressData) => {
    setFormData(prev => ({
      ...prev,
      address: addressData.address1 || "",
      city: addressData.city || "",
      state: addressData.state || "",
      zip: addressData.postal_code || ""
    }));
  };

  const validateForm = () => {
    // Email validation
    if (!formData.email) {
      setError("Please enter your email address");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    // Password validation
    if (!formData.password) {
      setError("Please enter a password");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    // Company info validation
    if (!formData.companyName) {
      setError("Please enter your company name");
      return false;
    }
    if (!formData.firstName) {
      setError("Please enter your first name");
      return false;
    }
    if (!formData.lastName) {
      setError("Please enter your last name");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setError("");
    setIsLoading(true);

    try {
      const result = await FirebaseFunctions.selfRegisterClient({
        email: formData.email,
        password: formData.password,
        companyName: formData.companyName,
        contactName: `${formData.firstName} ${formData.lastName}`.trim(),
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        portalSlug: companySlug
      });

      if (result.success) {
        // Sign in directly with Firebase Auth
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        // Use full page navigation to avoid main app's auth interference
        window.location.href = `/portal/${companySlug}/dashboard`;
      } else {
        setError(result.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err.code === 'functions/already-exists') {
        setError(err.message || "An account already exists. Please try logging in instead.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered. Please try logging in instead.");
      } else {
        setError(err.message || "Registration failed. Please try again.");
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

          <CardTitle className="text-xl">Create Your Account with {companyData?.name}</CardTitle>
          <CardDescription>
            {companyData?.portalSettings?.registration_welcome_message ||
              "Sign up to submit jobs and track your orders"}
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

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Your company"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                required
              />
            </div>

            {/* First Name / Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Phone (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number <span className="text-slate-400 font-normal">(Optional)</span></Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                autoComplete="email"
              />
              {emailWarning && (
                <p className="text-xs text-amber-600">{emailWarning}</p>
              )}
            </div>

            {/* Password / Confirm Password */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    autoComplete="new-password"
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
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Address (Optional) */}
            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label>Address <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <AddressAutocomplete
                  value={formData.address}
                  onChange={(val) => handleInputChange('address', val)}
                  onAddressSelect={handleAddressSelect}
                  placeholder="Start typing your address..."
                />
              </div>

              {formData.address && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">City</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="City"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">State</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="State"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ZIP</Label>
                    <Input
                      value={formData.zip}
                      onChange={(e) => handleInputChange('zip', e.target.value)}
                      placeholder="ZIP"
                      className="text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full mt-4"
              style={{ backgroundColor: primaryColor }}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            <p>
              Already have an account?{" "}
              <Link
                to={`/portal/${companySlug}/login`}
                className="font-medium hover:underline"
                style={{ color: primaryColor }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
