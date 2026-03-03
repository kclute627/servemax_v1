import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2,
  User,
  AlertCircle,
  Check,
  ArrowRight
} from 'lucide-react';
import { FirebaseAuth } from '@/firebase/auth';
import { createPageUrl } from '@/utils';
import {
  getAuthErrorMessage,
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validateCompanyName,
  validateWebsite,
  validatePasswords,
  formatPhoneNumber
} from '@/utils/authErrors';
import AddressAutocomplete from '@/components/jobs/AddressAutocomplete';
import PublicNavbar from '@/components/layout/PublicNavbar';
import logoFullWhite from '@/images/logo-full-white.png';

export default function SignUpPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    company_name: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    county: '',
    latitude: null,
    longitude: null
  });

  const [isAddressLoading, setIsAddressLoading] = useState(false);

  const handleInputChange = (field, value) => {
    if (field === 'phone') {
      value = formatPhoneNumber(value);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleAddressSelect = (addressDetails) => {
    setFormData(prev => ({
      ...prev,
      address: addressDetails.address1 || '',
      city: addressDetails.city || '',
      state: addressDetails.state || '',
      zip: addressDetails.postal_code || '',
      county: addressDetails.county || '',
      latitude: addressDetails.latitude || null,
      longitude: addressDetails.longitude || null
    }));
  };

  const validateForm = () => {
    const errors = {};

    const firstNameError = validateName(formData.first_name, 'First name');
    if (firstNameError) errors.first_name = firstNameError;

    const lastNameError = validateName(formData.last_name, 'Last name');
    if (lastNameError) errors.last_name = lastNameError;

    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;

    const phoneError = validatePhone(formData.phone);
    if (phoneError) errors.phone = phoneError;

    const passwordError = validatePasswords(formData.password, formData.confirmPassword);
    if (passwordError) {
      if (passwordError.includes('match')) {
        errors.confirmPassword = passwordError;
      } else {
        errors.password = passwordError;
      }
    }

    const companyNameError = validateCompanyName(formData.company_name);
    if (companyNameError) errors.company_name = companyNameError;

    const websiteError = validateWebsite(formData.website);
    if (websiteError) errors.website = websiteError;

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError('Please fix the errors below');
      return false;
    }

    return true;
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      const userData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        full_name: `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim()
      };

      const companyData = {
        name: formData.company_name,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        county: formData.county,
        lat: formData.latitude,
        lng: formData.longitude
      };

      const result = await FirebaseAuth.registerCompanyOwner(userData, companyData);
      navigate('/Dashboard', { replace: true });
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const inputStyles = (hasError) => `
    h-12 bg-stone-50 border-stone-200 rounded-xl transition-all
    focus:border-emerald-500 focus:ring-emerald-500/20
    ${hasError ? 'border-red-400 focus:border-red-500' : ''}
  `;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-display { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
      `}</style>

      <PublicNavbar />

      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 py-24">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-emerald-100/40 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-100/30 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        </div>

        <div className="w-full max-w-2xl relative">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-[#0D2E26] rounded-2xl px-6 py-4 mb-6">
              <img src={logoFullWhite} alt="Diligence" className="h-12" />
            </div>
            <h1 className="text-3xl font-bold text-stone-900 mb-2">
              Start your free trial
            </h1>
            <p className="text-stone-600">No credit card required • 30 days free • Cancel anytime</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-200/50 p-8">
            <form onSubmit={handleSignUp} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Personal Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-stone-200">
                  <div className="w-10 h-10 bg-[#0D2E26] rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-lg text-stone-900">Personal Information</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-stone-700 font-medium">First Name</Label>
                    <Input
                      type="text"
                      placeholder="John"
                      className={inputStyles(fieldErrors.first_name)}
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      required
                    />
                    {fieldErrors.first_name && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.first_name}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-stone-700 font-medium">Last Name</Label>
                    <Input
                      type="text"
                      placeholder="Smith"
                      className={inputStyles(fieldErrors.last_name)}
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      required
                    />
                    {fieldErrors.last_name && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.last_name}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-stone-700 font-medium">Email Address</Label>
                  <Input
                    type="email"
                    placeholder="john@company.com"
                    className={inputStyles(fieldErrors.email)}
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                  {fieldErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
                  )}
                  <p className="text-xs text-stone-500 mt-1.5">Used for your account and company contact</p>
                </div>

                <div>
                  <Label className="text-stone-700 font-medium">Phone Number <span className="text-stone-400 font-normal">(Optional)</span></Label>
                  <Input
                    type="tel"
                    placeholder="(555) 123-4567"
                    className={inputStyles(fieldErrors.phone)}
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                  {fieldErrors.phone && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.phone}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-stone-700 font-medium">Password</Label>
                    <Input
                      type="password"
                      placeholder="At least 8 characters"
                      className={inputStyles(fieldErrors.password)}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      required
                    />
                    {fieldErrors.password && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-stone-700 font-medium">Confirm Password</Label>
                    <Input
                      type="password"
                      placeholder="Confirm password"
                      className={inputStyles(fieldErrors.confirmPassword)}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      required
                    />
                    {fieldErrors.confirmPassword && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Company Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-stone-200">
                  <div className="w-10 h-10 bg-[#0D2E26] rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-lg text-stone-900">Company Information</h3>
                </div>

                <div>
                  <Label className="text-stone-700 font-medium">Company Name</Label>
                  <Input
                    type="text"
                    placeholder="ABC Process Serving"
                    className={inputStyles(fieldErrors.company_name)}
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    required
                  />
                  {fieldErrors.company_name && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.company_name}</p>
                  )}
                </div>

                <div>
                  <Label className="text-stone-700 font-medium">Website <span className="text-stone-400 font-normal">(Optional)</span></Label>
                  <Input
                    type="url"
                    placeholder="www.yourcompany.com"
                    className={inputStyles(fieldErrors.website)}
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                  />
                  {fieldErrors.website && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.website}</p>
                  )}
                </div>

                <div>
                  <Label className="text-stone-700 font-medium">Address</Label>
                  <AddressAutocomplete
                    value={formData.address}
                    onChange={(value) => handleInputChange('address', value)}
                    onAddressSelect={handleAddressSelect}
                    onLoadingChange={setIsAddressLoading}
                    placeholder="Start typing your company address..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-stone-700 font-medium">City</Label>
                    <Input
                      type="text"
                      placeholder="City"
                      className={inputStyles(false)}
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      disabled={isAddressLoading}
                    />
                  </div>
                  <div>
                    <Label className="text-stone-700 font-medium">State</Label>
                    <Input
                      type="text"
                      placeholder="CA"
                      maxLength={2}
                      className={inputStyles(false)}
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      disabled={isAddressLoading}
                    />
                  </div>
                  <div>
                    <Label className="text-stone-700 font-medium">ZIP Code</Label>
                    <Input
                      type="text"
                      placeholder="90210"
                      className={inputStyles(false)}
                      value={formData.zip}
                      onChange={(e) => handleInputChange('zip', e.target.value)}
                      disabled={isAddressLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Trial Information */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-emerald-900 text-lg">30-Day Free Trial</h3>
                </div>
                <ul className="text-sm text-emerald-800 space-y-2">
                  {[
                    'Up to 100 jobs during trial period',
                    'Full access to all features',
                    'No credit card required',
                    'Cancel anytime'
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#0D2E26] hover:bg-[#134035] text-white rounded-xl font-medium transition-all hover:scale-[1.01]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Start free trial
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>

              <div className="pt-6 border-t border-stone-100 text-center">
                <p className="text-stone-600">
                  Already have an account?{' '}
                  <Link
                    to={createPageUrl('Login')}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
