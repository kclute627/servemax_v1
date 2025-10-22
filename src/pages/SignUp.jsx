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
  Mail,
  Lock,
  Phone,
  MapPin,
  FileText,
  CheckCircle,
  AlertCircle,
  Globe
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

export default function SignUpPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [userData, setUserData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });

  // Field-specific errors
  const [fieldErrors, setFieldErrors] = useState({});

  const [companyData, setCompanyData] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zip: ''
  });

  const handleUserDataChange = (field, value) => {
    // Format phone number on input
    if (field === 'phone') {
      value = formatPhoneNumber(value);
    }

    setUserData(prev => ({ ...prev, [field]: value }));
    setError('');

    // Clear field-specific error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleCompanyDataChange = (field, value) => {
    // Format phone number on input
    if (field === 'phone') {
      value = formatPhoneNumber(value);
    }

    setCompanyData(prev => ({ ...prev, [field]: value }));
    setError('');

    // Clear field-specific error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateUserData = () => {
    const errors = {};

    // Validate first name
    const firstNameError = validateName(userData.first_name, 'First name');
    if (firstNameError) errors.first_name = firstNameError;

    // Validate last name
    const lastNameError = validateName(userData.last_name, 'Last name');
    if (lastNameError) errors.last_name = lastNameError;

    // Validate email
    const emailError = validateEmail(userData.email);
    if (emailError) errors.email = emailError;

    // Validate phone (optional)
    const phoneError = validatePhone(userData.phone);
    if (phoneError) errors.phone = phoneError;

    // Validate passwords
    const passwordError = validatePasswords(userData.password, userData.confirmPassword);
    if (passwordError) {
      if (passwordError.includes('match')) {
        errors.confirmPassword = passwordError;
      } else {
        errors.password = passwordError;
      }
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError('Please fix the errors below');
      return false;
    }

    return true;
  };

  const validateCompanyData = () => {
    const errors = {};

    // Validate company name
    const nameError = validateCompanyName(companyData.name);
    if (nameError) errors.name = nameError;

    // Validate company email
    const emailError = validateEmail(companyData.email);
    if (emailError) errors.email = emailError;

    // Validate company phone (optional)
    const phoneError = validatePhone(companyData.phone);
    if (phoneError) errors.phone = phoneError;

    // Validate company website (optional)
    const websiteError = validateWebsite(companyData.website);
    if (websiteError) errors.website = websiteError;

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError('Please fix the errors below');
      return false;
    }

    return true;
  };

  const handleStepOne = () => {
    if (validateUserData()) {
      setCurrentStep(2);
    }
  };

  const handleSignUp = async () => {
    if (!validateCompanyData()) return;

    setIsLoading(true);
    setError('');

    try {
      // Prepare user data with first_name and last_name
      const userDataToSubmit = {
        ...userData,
        full_name: `${userData.first_name.trim()} ${userData.last_name.trim()}`.trim()
      };

      await FirebaseAuth.registerCompanyOwner(userDataToSubmit, companyData);

      // Give Firebase a moment to update auth state, then navigate
      setTimeout(() => {
        navigate(createPageUrl('Dashboard'), { replace: true });
      }, 1000);
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'User Account', icon: User },
    { number: 2, title: 'Company Info', icon: Building2 },
    { number: 3, title: 'Welcome!', icon: CheckCircle }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">ServeMax</h1>
          </div>
          <p className="text-slate-600">Create your account and start your 30-day free trial</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <div className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${currentStep >= step.number
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-400'
                  }
                `}>
                  <step.icon className="w-5 h-5" />
                </div>
                <span className={`
                  ml-2 text-sm font-medium
                  ${currentStep >= step.number ? 'text-blue-600' : 'text-slate-400'}
                `}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  w-12 h-0.5 mx-4
                  ${currentStep > step.number ? 'bg-blue-600' : 'bg-slate-200'}
                `} />
              )}
            </React.Fragment>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && 'Create Your Account'}
              {currentStep === 2 && 'Company Information'}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && 'Enter your personal information to get started'}
              {currentStep === 2 && 'Tell us about your company to complete setup'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: User Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="first_name"
                        type="text"
                        placeholder="John"
                        className={`pl-10 ${fieldErrors.first_name ? 'border-red-500 focus:border-red-500' : ''}`}
                        value={userData.first_name}
                        onChange={(e) => handleUserDataChange('first_name', e.target.value)}
                      />
                    </div>
                    {fieldErrors.first_name && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.first_name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="last_name"
                        type="text"
                        placeholder="Smith"
                        className={`pl-10 ${fieldErrors.last_name ? 'border-red-500 focus:border-red-500' : ''}`}
                        value={userData.last_name}
                        onChange={(e) => handleUserDataChange('last_name', e.target.value)}
                      />
                    </div>
                    {fieldErrors.last_name && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.last_name}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@company.com"
                      className={`pl-10 ${fieldErrors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                      value={userData.email}
                      onChange={(e) => handleUserDataChange('email', e.target.value)}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      className={`pl-10 ${fieldErrors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
                      value={userData.phone}
                      onChange={(e) => handleUserDataChange('phone', e.target.value)}
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.phone}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 8 characters with uppercase, lowercase, and number"
                      className={`pl-10 ${fieldErrors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                      value={userData.password}
                      onChange={(e) => handleUserDataChange('password', e.target.value)}
                    />
                  </div>
                  {fieldErrors.password && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      className={`pl-10 ${fieldErrors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
                      value={userData.confirmPassword}
                      onChange={(e) => handleUserDataChange('confirmPassword', e.target.value)}
                    />
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                <Button
                  onClick={handleStepOne}
                  className="w-full"
                  size="lg"
                >
                  Continue to Company Info
                </Button>
              </div>
            )}

            {/* Step 2: Company Information */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company_name">Company Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="company_name"
                      type="text"
                      placeholder="ABC Process Serving"
                      className={`pl-10 ${fieldErrors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                      value={companyData.name}
                      onChange={(e) => handleCompanyDataChange('name', e.target.value)}
                    />
                  </div>
                  {fieldErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="company_email">Company Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="company_email"
                      type="email"
                      placeholder="info@company.com"
                      className={`pl-10 ${fieldErrors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                      value={companyData.email}
                      onChange={(e) => handleCompanyDataChange('email', e.target.value)}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="company_phone">Company Phone (Optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="company_phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      className={`pl-10 ${fieldErrors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
                      value={companyData.phone}
                      onChange={(e) => handleCompanyDataChange('phone', e.target.value)}
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.phone}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="company_website">Company Website (Optional)</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="company_website"
                      type="url"
                      placeholder="www.yourcompany.com"
                      className={`pl-10 ${fieldErrors.website ? 'border-red-500 focus:border-red-500' : ''}`}
                      value={companyData.website}
                      onChange={(e) => handleCompanyDataChange('website', e.target.value)}
                    />
                  </div>
                  {fieldErrors.website && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.website}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="address"
                      type="text"
                      placeholder="123 Main Street"
                      className="pl-10"
                      value={companyData.address}
                      onChange={(e) => handleCompanyDataChange('address', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      type="text"
                      placeholder="City"
                      value={companyData.city}
                      onChange={(e) => handleCompanyDataChange('city', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      type="text"
                      placeholder="CA"
                      value={companyData.state}
                      onChange={(e) => handleCompanyDataChange('state', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    type="text"
                    placeholder="90210"
                    value={companyData.zip}
                    onChange={(e) => handleCompanyDataChange('zip', e.target.value)}
                  />
                </div>

                {/* Trial Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">🎉 30-Day Free Trial</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Up to 100 jobs during trial period</li>
                    <li>• Full access to all features</li>
                    <li>• No credit card required</li>
                    <li>• Cancel anytime</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSignUp}
                    disabled={isLoading}
                    className="flex-1"
                    size="lg"
                  >
                    {isLoading ? 'Creating Account...' : 'Start Free Trial'}
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            <div className="text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link
                to={createPageUrl('Login')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Sign in here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}