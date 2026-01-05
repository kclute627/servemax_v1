import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Lock,
  Save,
  Loader2,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useClientAuth } from "@/components/auth/ClientAuthProvider";
import { FirebaseFunctions } from "@/firebase/functions";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth } from "@/firebase/config";

export default function ClientSettings() {
  const { companySlug } = useParams();
  const { clientUser, portalData, refreshPortalData } = useClientAuth();
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profile form state
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    address: "",
    city: "",
    state: "",
    zip: ""
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const branding = portalData?.branding || {};
  const primaryColor = branding.primary_color || '#0f172a';

  // Load client data
  useEffect(() => {
    if (clientUser) {
      setProfile({
        name: clientUser.name || "",
        email: clientUser.email || "",
        phone: clientUser.phone || "",
        company_name: clientUser.company_name || portalData?.company?.name || "",
        address: clientUser.address || "",
        city: clientUser.city || "",
        state: clientUser.state || "",
        zip: clientUser.zip || ""
      });
    }
  }, [clientUser, portalData]);

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await FirebaseFunctions.updateClientProfile({
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        zip: profile.zip
      });

      if (refreshPortalData) {
        await refreshPortalData();
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully."
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update profile. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword) {
      toast({ variant: "destructive", title: "Error", description: "Please enter your current password." });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({ variant: "destructive", title: "Error", description: "New password must be at least 6 characters." });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "New passwords do not match." });
      return;
    }

    setIsChangingPassword(true);
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordForm.newPassword);

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully."
      });
    } catch (error) {
      console.error("Error changing password:", error);
      let message = "Failed to change password. Please try again.";
      if (error.code === "auth/wrong-password") message = "Current password is incorrect.";
      else if (error.code === "auth/weak-password") message = "New password is too weak.";
      toast({ variant: "destructive", title: "Error", description: message });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!clientUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your profile and account</p>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}10` }}
            >
              <User className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Profile Information</h2>
              <p className="text-sm text-slate-500">Update your personal details</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Name & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Full Name</Label>
              <Input
                value={profile.name}
                onChange={(e) => handleProfileChange("name", e.target.value)}
                placeholder="Your full name"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Email Address</Label>
              <div className="relative">
                <Input
                  value={profile.email}
                  disabled
                  className="h-11 rounded-xl bg-slate-50 text-slate-500 pr-10"
                />
                <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
              <p className="text-xs text-slate-400">Email cannot be changed</p>
            </div>
          </div>

          {/* Phone & Company */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Phone Number</Label>
              <div className="relative">
                <Input
                  value={profile.phone}
                  onChange={(e) => handleProfileChange("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                  className="h-11 rounded-xl pr-10"
                />
                <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Company</Label>
              <div className="relative">
                <Input
                  value={profile.company_name}
                  disabled
                  className="h-11 rounded-xl bg-slate-50 text-slate-500 pr-10"
                />
                <Building2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-700">Address</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Street Address</Label>
                <Input
                  value={profile.address}
                  onChange={(e) => handleProfileChange("address", e.target.value)}
                  placeholder="123 Main Street"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label className="text-slate-700">City</Label>
                  <Input
                    value={profile.city}
                    onChange={(e) => handleProfileChange("city", e.target.value)}
                    placeholder="City"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">State</Label>
                  <Input
                    value={profile.state}
                    onChange={(e) => handleProfileChange("state", e.target.value)}
                    placeholder="CA"
                    maxLength={2}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">ZIP</Label>
                  <Input
                    value={profile.zip}
                    onChange={(e) => handleProfileChange("zip", e.target.value)}
                    placeholder="90210"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="text-white rounded-xl px-6"
              style={{ backgroundColor: primaryColor }}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <Shield className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Security</h2>
              <p className="text-sm text-slate-500">Change your account password</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-700">Current Password</Label>
            <div className="relative">
              <Input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                placeholder="Enter current password"
                className="h-11 rounded-xl pr-10"
              />
              <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-700">New Password</Label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                placeholder="Enter new password"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Confirm New Password</Label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                placeholder="Confirm new password"
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <p className="text-xs text-slate-400">Password must be at least 6 characters long.</p>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}
              variant="outline"
              className="rounded-xl"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
