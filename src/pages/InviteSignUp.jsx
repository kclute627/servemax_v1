import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Mail,
  Lock,
  Phone,
  FileText,
  AlertCircle,
  CheckCircle,
  Building2,
  Users,
  ArrowLeft
} from 'lucide-react';
import { User as FirebaseAuth, Invitation } from '@/api/entities';
import { createPageUrl } from '@/utils';
import PublicNavbar from '@/components/layout/PublicNavbar';

export default function InviteSignUpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState(null);
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });

  useEffect(() => {
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    if (!token) {
      setError('Invalid invitation link. Please check your invitation email.');
      setIsLoadingInvitation(false);
      return;
    }

    try {
      const invitationData = await Invitation.filter({ invitation_token: token });
      if (invitationData.length === 0) {
        setError('Invitation not found or may have expired.');
        setIsLoadingInvitation(false);
        return;
      }

      const invite = invitationData[0];
      if (invite.status !== 'pending') {
        setError('This invitation has already been used or expired.');
        setIsLoadingInvitation(false);
        return;
      }

      if (new Date() > new Date(invite.expires_at)) {
        setError('This invitation has expired. Please request a new invitation.');
        setIsLoadingInvitation(false);
        return;
      }

      setInvitation(invite);
      setFormData(prev => ({ ...prev, email: invite.email }));
    } catch (err) {
      console.error('Error loading invitation:', err);
      setError('Failed to load invitation. Please try again.');
    } finally {
      setIsLoadingInvitation(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.full_name.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
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
      await FirebaseAuth.registerViaInvitation(token, formData);

      // Redirect to dashboard
      navigate(createPageUrl('Dashboard'), { replace: true });
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getUserTypeDisplay = (userType, employeeRole) => {
    if (userType === 'employee') {
      const roleNames = {
        admin: 'Administrator',
        manager: 'Manager',
        process_server: 'Process Server'
      };
      return {
        title: `${roleNames[employeeRole] || 'Employee'}`,
        description: 'Access to company jobs and data based on your role',
        icon: Users,
        color: 'bg-blue-100 text-blue-700'
      };
    } else if (userType === 'independent_contractor') {
      return {
        title: 'Independent Contractor',
        description: 'Free account to work with multiple companies',
        icon: User,
        color: 'bg-green-100 text-green-700'
      };
    }
    return null;
  };

  if (isLoadingInvitation) {
    return (
      <>
        <PublicNavbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-white flex items-center justify-center pt-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">Loading invitation...</p>
          </div>
        </div>
      </>
    );
  }

  if (!invitation) {
    return (
      <>
        <PublicNavbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-white flex items-center justify-center p-4 pt-24">
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent mb-2">
                Invalid Invitation
              </h1>
              <p className="text-slate-600">Unable to load your invitation</p>
            </div>

            <Card className="shadow-2xl border-slate-200/50 backdrop-blur-sm bg-white/95">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <CardTitle>Invitation Error</CardTitle>
                    <CardDescription>This invitation link is not valid</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>

                <Link to={createPageUrl('Login')} className="block">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  const userTypeInfo = getUserTypeDisplay(invitation.user_type, invitation.employee_role);

  return (
    <>
      <PublicNavbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-white flex items-center justify-center p-4 pt-24">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent mb-2">
              You're Invited!
            </h1>
            <p className="text-slate-600">Complete your account setup</p>
          </div>

          <Card className="shadow-2xl border-slate-200/50 backdrop-blur-sm bg-white/95">
            <CardHeader>
              <CardTitle>Join ServeMax</CardTitle>
              <CardDescription>
                Complete your account to get started with your team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Invitation Details */}
              {userTypeInfo && (
                <div className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-100 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <userTypeInfo.icon className="h-5 w-5 text-blue-700" />
                    </div>
                    <span className="font-semibold text-slate-800">Your Role</span>
                  </div>
                  <div className="space-y-2">
                    <Badge className={userTypeInfo.color}>
                      {userTypeInfo.title}
                    </Badge>
                    <p className="text-sm text-slate-600">{userTypeInfo.description}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSignUp} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-slate-700 font-medium">Full Name</Label>
                  <div className="relative group">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    <Input
                      id="full_name"
                      type="text"
                      placeholder="John Smith"
                      className="pl-10 h-11 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-10 h-11 bg-slate-50 transition-all duration-200"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={true} // Email is pre-filled from invitation
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    This email was provided in your invitation
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-700 font-medium">Phone Number <span className="text-slate-400 font-normal">(Optional)</span></Label>
                  <div className="relative group">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      className="pl-10 h-11 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 6 characters"
                      className="pl-10 h-11 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">Confirm Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      className="pl-10 h-11 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-900 hover:to-blue-950 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating Account...' : 'Complete Setup'}
                </Button>
              </form>

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
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}