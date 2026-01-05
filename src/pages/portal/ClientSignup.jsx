import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Building2, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { entities } from "@/firebase/database";
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
  const [step, setStep] = useState(1);
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
    contactName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: ""
  });

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
            id: company.id,
            name: company.name,
            branding: company.branding || {},
            portalSettings: company.portal_settings || {}
          });

          // Check if self-registration is enabled
          if (!company.portal_settings?.allow_self_registration) {
            navigate(`/portal/${companySlug}/login`);
          }
        } else {
          navigate('/');
        }
      } catch (err) {
        console.error('Error loading company:', err);
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

  const validateStep = (stepNum) => {
    switch (stepNum) {
      case 1:
        if (!formData.email || !formData.password || !formData.confirmPassword) {
          setError("Please fill in all fields");
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          setError("Please enter a valid email address");
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
        return true;
      case 2:
        if (!formData.companyName || !formData.contactName) {
          setError("Please fill in all fields");
          return false;
        }
        return true;
      case 3:
        if (!formData.phone) {
          setError("Please enter a phone number");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setError("");
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setError("");
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    setError("");
    setIsLoading(true);

    try {
      const result = await FirebaseFunctions.selfRegisterClient({
        email: formData.email,
        password: formData.password,
        companyName: formData.companyName,
        contactName: formData.contactName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        portalSlug: companySlug
      });

      if (result.success) {
        // Sign in directly with Firebase Auth
        // (Can't use useClientAuth hook since we're outside ClientAuthProvider)
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        // Use full page navigation to avoid main app's auth interference
        // React Router's navigate() stays in the same context where main app's AuthProvider is already processing
        window.location.href = `/portal/${companySlug}/dashboard`;
      } else {
        setError(result.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err.code === 'functions/already-exists') {
        // Display the specific message from the server (e.g., "You already have an account with this company")
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

          <CardTitle className="text-xl">Create Your Account</CardTitle>
          <CardDescription>
            {companyData?.portalSettings?.registration_welcome_message ||
              "Sign up to submit jobs and track your orders"}
          </CardDescription>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-3 h-3 rounded-full transition-colors ${
                  s === step ? 'bg-blue-600' : s < step ? 'bg-green-500' : 'bg-slate-200'
                }`}
                style={s === step ? { backgroundColor: primaryColor } : {}}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Email & Password */}
            {step === 1 && (
              <div className="space-y-4">
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

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
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
                  <p className="text-xs text-slate-500">At least 6 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <Button
                  type="button"
                  onClick={nextStep}
                  className="w-full"
                  style={{ backgroundColor: primaryColor }}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Company Info */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Your company name"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactName">Your Name</Label>
                  <Input
                    id="contactName"
                    type="text"
                    placeholder="Your full name"
                    value={formData.contactName}
                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="flex-1"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Contact Details */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Address (Optional)</Label>
                  <AddressAutocomplete
                    value={formData.address}
                    onChange={(val) => handleInputChange('address', val)}
                    onSelect={handleAddressSelect}
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

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
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
                </div>
              </div>
            )}
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
