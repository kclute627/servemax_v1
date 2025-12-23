import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  User,
  AlertCircle,
  Check
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

export default function SignUpPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Field-specific errors
  const [fieldErrors, setFieldErrors] = useState({});

  // Combined form data - single source of truth
  const [formData, setFormData] = useState({
    // Personal Information
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    // Company Information
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
    // Format phone number on input
    if (field === 'phone') {
      value = formatPhoneNumber(value);
    }

    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');

    // Clear field-specific error when user starts typing
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

    // Validate first name
    const firstNameError = validateName(formData.first_name, 'First name');
    if (firstNameError) errors.first_name = firstNameError;

    // Validate last name
    const lastNameError = validateName(formData.last_name, 'Last name');
    if (lastNameError) errors.last_name = lastNameError;

    // Validate email
    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;

    // Validate phone (optional)
    const phoneError = validatePhone(formData.phone);
    if (phoneError) errors.phone = phoneError;

    // Validate passwords
    const passwordError = validatePasswords(formData.password, formData.confirmPassword);
    if (passwordError) {
      if (passwordError.includes('match')) {
        errors.confirmPassword = passwordError;
      } else {
        errors.password = passwordError;
      }
    }

    // Validate company name
    const companyNameError = validateCompanyName(formData.company_name);
    if (companyNameError) errors.company_name = companyNameError;

    // Validate company website (optional)
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
      // Prepare user data
      const userData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        full_name: `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim()
      };

      // Prepare company data - using same email and phone as user
      const companyData = {
        name: formData.company_name,
        email: formData.email, // Same as user email
        phone: formData.phone, // Same as user phone
        website: formData.website,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        county: formData.county,
        lat: formData.latitude, // From address autocomplete (rename to match schema)
        lng: formData.longitude // From address autocomplete (rename to match schema)
      };

      const result = await FirebaseAuth.registerCompanyOwner(userData, companyData);

      // Navigate to dashboard - user can verify email later from Settings
      navigate('/Dashboard', { replace: true });
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <>
      <PublicNavbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-white flex items-center justify-center p-4 py-24">
        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent mb-2">
              Start Your Free Trial
            </h1>
            <p className="text-slate-600">No credit card required • 30 days free • Cancel anytime</p>
          </div>

          <Card className="shadow-2xl border-slate-200/50 backdrop-blur-sm bg-white/95">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl">Create Your Account</CardTitle>
            <CardDescription className="text-base">
              Set up your account and company profile to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Personal Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b-2 border-blue-100">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900">Personal Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name" className="text-slate-700 font-medium">First Name</Label>
                    <Input
                      id="first_name"
                      type="text"
                      placeholder="John"
                      className={`h-11 transition-all duration-200 ${fieldErrors.first_name ? 'border-red-500 focus:border-red-500' : 'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      required
                    />
                    {fieldErrors.first_name && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.first_name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="last_name" className="text-slate-700 font-medium">Last Name</Label>
                    <Input
                      id="last_name"
                      type="text"
                      placeholder="Smith"
                      className={`h-11 transition-all duration-200 ${fieldErrors.last_name ? 'border-red-500 focus:border-red-500' : 'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
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
                  <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@company.com"
                    className={`h-11 transition-all duration-200 ${fieldErrors.email ? 'border-red-500 focus:border-red-500' : 'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                  {fieldErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1.5">This will be used for your account and company contact</p>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-slate-700 font-medium">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    className={`h-11 transition-all duration-200 ${fieldErrors.phone ? 'border-red-500 focus:border-red-500' : 'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                  {fieldErrors.phone && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.phone}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    className={`h-11 transition-all duration-200 ${fieldErrors.password ? 'border-red-500 focus:border-red-500' : 'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                  />
                  {fieldErrors.password && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    className={`h-11 transition-all duration-200 ${fieldErrors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                  />
                  {fieldErrors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Company Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b-2 border-blue-100">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900">Company Information</h3>
                </div>

                <div>
                  <Label htmlFor="company_name" className="text-slate-700 font-medium">Company Name</Label>
                  <Input
                    id="company_name"
                    type="text"
                    placeholder="ABC Process Serving"
                    className={`h-11 transition-all duration-200 ${fieldErrors.company_name ? 'border-red-500 focus:border-red-500' : 'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    required
                  />
                  {fieldErrors.company_name && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.company_name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="company_website" className="text-slate-700 font-medium">Company Website (Optional)</Label>
                  <Input
                    id="company_website"
                    type="url"
                    placeholder="www.yourcompany.com"
                    className={`h-11 transition-all duration-200 ${fieldErrors.website ? 'border-red-500 focus:border-red-500' : 'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                  />
                  {fieldErrors.website && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.website}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="address" className="text-slate-700 font-medium">Address</Label>
                  <AddressAutocomplete
                    id="address"
                    value={formData.address}
                    onChange={(value) => handleInputChange('address', value)}
                    onAddressSelect={handleAddressSelect}
                    onLoadingChange={setIsAddressLoading}
                    placeholder="Start typing your company address..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-slate-700 font-medium">City</Label>
                    <Input
                      id="city"
                      type="text"
                      placeholder="City"
                      className="h-11"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      disabled={isAddressLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-slate-700 font-medium">State</Label>
                    <Input
                      id="state"
                      type="text"
                      placeholder="CA"
                      maxLength={2}
                      className="h-11"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      disabled={isAddressLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip" className="text-slate-700 font-medium">ZIP Code</Label>
                    <Input
                      id="zip"
                      type="text"
                      placeholder="90210"
                      className="h-11"
                      value={formData.zip}
                      onChange={(e) => handleInputChange('zip', e.target.value)}
                      disabled={isAddressLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Trial Information */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-blue-900 text-lg">30-Day Free Trial</h3>
                </div>
                <ul className="text-sm text-blue-900 space-y-2.5">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Up to 100 jobs during trial period</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Full access to all features</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>No credit card required</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Cancel anytime</span>
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-900 hover:to-blue-950 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] text-base font-semibold"
                size="lg"
              >
                {isLoading ? 'Creating Account...' : 'Start Free Trial'}
              </Button>

              <Separator className="my-6" />

              <div className="text-center text-sm text-slate-600">
                Already have an account?{' '}
                <Link
                  to={createPageUrl('Login')}
                  className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-all"
                >
                  Sign in here
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
}