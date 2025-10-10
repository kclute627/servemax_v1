import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { FirebaseAuth } from '@/firebase/auth';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/auth/AuthProvider';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.currentPassword) {
      setError('Current password is required');
      return;
    }

    if (!formData.newPassword) {
      setError('New password is required');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // First verify current password by attempting to login
      await FirebaseAuth.login(user.email, formData.currentPassword);

      // Then update to new password
      await FirebaseAuth.updatePassword(formData.newPassword);

      setSuccess(true);

      // Redirect to settings after 3 seconds
      setTimeout(() => {
        navigate(createPageUrl('Settings'), { replace: true });
      }, 3000);
    } catch (err) {
      console.error('Password change error:', err);

      if (err.message.includes('wrong-password') || err.message.includes('invalid-credential')) {
        setError('Current password is incorrect');
      } else if (err.message.includes('weak-password')) {
        setError('New password is too weak. Please choose a stronger password.');
      } else if (err.message.includes('requires-recent-login')) {
        setError('For security reasons, please log out and log back in before changing your password.');
      } else {
        setError('Failed to change password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 pt-8">
        <div className="max-w-2xl mx-auto p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>Password Changed Successfully</CardTitle>
                  <CardDescription>Your password has been updated</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your password has been changed successfully. For security, you'll remain logged in on this device.
                </AlertDescription>
              </Alert>

              <p className="text-sm text-slate-600">
                You will be redirected to Settings automatically, or you can click the button below.
              </p>

              <Button
                onClick={() => navigate(createPageUrl('Settings'))}
                className="w-full"
              >
                Back to Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-8">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl('Settings'))}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Change Password</h1>
              <p className="text-slate-600">Update your account password</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Change Your Password</CardTitle>
            <CardDescription>
              Enter your current password and choose a new secure password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="Enter your current password"
                    className="pl-10"
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="At least 6 characters"
                    className="pl-10"
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your new password"
                    className="pl-10"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Password Requirements */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-900 mb-2">Password Requirements:</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li className={`flex items-center gap-2 ${formData.newPassword.length >= 6 ? 'text-green-600' : ''}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${formData.newPassword.length >= 6 ? 'bg-green-600' : 'bg-slate-300'}`} />
                    At least 6 characters long
                  </li>
                  <li className={`flex items-center gap-2 ${formData.newPassword && formData.currentPassword !== formData.newPassword ? 'text-green-600' : ''}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${formData.newPassword && formData.currentPassword !== formData.newPassword ? 'bg-green-600' : 'bg-slate-300'}`} />
                    Different from current password
                  </li>
                  <li className={`flex items-center gap-2 ${formData.newPassword && formData.confirmPassword && formData.newPassword === formData.confirmPassword ? 'text-green-600' : ''}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${formData.newPassword && formData.confirmPassword && formData.newPassword === formData.confirmPassword ? 'bg-green-600' : 'bg-slate-300'}`} />
                    Passwords match
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(createPageUrl('Settings'))}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? 'Changing Password...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security Note */}
        <div className="mt-6">
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <strong>Security tip:</strong> Choose a strong password that includes a mix of letters, numbers, and symbols.
              Don't reuse passwords from other accounts.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}