
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, Mail, Save, Loader2, UserCircle, Map, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AddressAutocomplete from "../jobs/AddressAutocomplete";
import ESignatureSection from "./ESignatureSection";

export default function UserSettingsPanel() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    license_number: '',
    address: { address1: '', address2: '', city: '', state: '', postal_code: '' },
    service_areas_text: '',
    notification_preferences: {
      job_assigned: true,
      job_completed: false,
      mention_in_notes: true,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true);
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        
        // Split full_name into first and last names if available
        const nameParts = currentUser.full_name?.split(' ') || ['', ''];
        const firstName = nameParts[0] || currentUser.first_name || '';
        const lastName = nameParts.slice(1).join(' ') || currentUser.last_name || '';
        
        setFormData({
          first_name: firstName,
          last_name: lastName,
          license_number: currentUser.license_number || '',
          address: currentUser.address || { address1: '', address2: '', city: '', state: '', postal_code: '' },
          service_areas_text: (currentUser.service_areas || []).join(', '),
          notification_preferences: currentUser.notification_preferences || { job_assigned: true, job_completed: false, mention_in_notes: true }
        });

      } catch (error) {
        console.error("Failed to load user data:", error);
      }
      setIsLoading(false);
    };
    loadUserData();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const handleAddressSelect = (addressDetails) => {
    setFormData(prev => ({
      ...prev,
      address: {
        address1: addressDetails.address1 || '',
        address2: prev.address.address2, // Keep suite number
        city: addressDetails.city || '',
        state: addressDetails.state || '',
        postal_code: addressDetails.postal_code || '',
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const service_areas = formData.service_areas_text.split(',').map(s => s.trim()).filter(Boolean);
      const full_name = `${formData.first_name} ${formData.last_name}`.trim();
      
      await User.updateMyUserData({
        first_name: formData.first_name,
        last_name: formData.last_name,
        full_name: full_name, // Update the built-in full_name field too
        license_number: formData.license_number,
        address: formData.address,
        service_areas: service_areas,
        notification_preferences: formData.notification_preferences,
      });
      alert("Your settings have been saved.");
    } catch (error) {
      console.error("Failed to save user settings:", error);
      alert("An error occurred while saving your settings.");
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
        <div className="space-y-6">
            <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCircle className="w-5 h-5" />Profile Information</CardTitle>
          <CardDescription>Your personal and professional information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" value={formData.first_name} onChange={(e) => handleInputChange('first_name', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" value={formData.last_name} onChange={(e) => handleInputChange('last_name', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Email Address</Label>
            <p className="text-sm text-slate-500 font-medium bg-slate-100 p-2 rounded-md border border-slate-200">{user?.email} (cannot be changed)</p>
          </div>
          <div>
            <Label htmlFor="license_number">License Number</Label>
            <Input id="license_number" value={formData.license_number} onChange={(e) => handleInputChange('license_number', e.target.value)} placeholder="e.g., PC12345" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Map className="w-5 h-5" />Address</CardTitle>
          <CardDescription>Your primary contact address.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <Label htmlFor="address1">Street Address</Label>
              <AddressAutocomplete
                id="address1"
                value={formData.address.address1}
                onChange={(value) => handleAddressFieldChange('address1', value)}
                onAddressSelect={handleAddressSelect}
                onLoadingChange={setIsAddressLoading}
              />
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="address2">Apt/Suite</Label>
              <Input id="address2" value={formData.address.address2} onChange={(e) => handleAddressFieldChange('address2', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={formData.address.city} onChange={(e) => handleAddressFieldChange('city', e.target.value)} disabled={isAddressLoading} />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" value={formData.address.state} onChange={(e) => handleAddressFieldChange('state', e.target.value)} disabled={isAddressLoading} />
            </div>
            <div>
              <Label htmlFor="postal_code">ZIP Code</Label>
              <Input id="postal_code" value={formData.address.postal_code} onChange={(e) => handleAddressFieldChange('postal_code', e.target.value)} disabled={isAddressLoading} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5" />Service Area</CardTitle>
          <CardDescription>Define the geographic areas you cover.</CardDescription>
        </CardHeader>
        <CardContent>
            <Label htmlFor="service_areas_text">Counties or ZIP Codes</Label>
            <Textarea
              id="service_areas_text"
              value={formData.service_areas_text}
              onChange={(e) => handleInputChange('service_areas_text', e.target.value)}
              placeholder="e.g., Cook County, 60601, DuPage County, Lake County"
              rows={3}
            />
            <p className="text-xs text-slate-500 mt-2">Separate multiple areas with a comma.</p>
        </CardContent>
      </Card>

      {/* E-Signature Section */}
      <ESignatureSection user={user} onUserUpdate={() => setUser({...user})} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" />Notification Settings</CardTitle>
          <CardDescription>Choose how you want to be notified about account activity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50">
            <div>
              <Label htmlFor="job-assigned" className="font-medium">Job Assigned</Label>
              <p className="text-sm text-slate-600">Notify me when a new job is assigned to me.</p>
            </div>
            <Switch id="job-assigned" checked={formData.notification_preferences.job_assigned} onCheckedChange={(c) => handleInputChange('notification_preferences', {...formData.notification_preferences, job_assigned: c})} />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50">
            <div>
              <Label htmlFor="job-completed" className="font-medium">Job Completed</Label>
              <p className="text-sm text-slate-600">Notify me when a job I'm on is completed.</p>
            </div>
            <Switch id="job-completed" checked={formData.notification_preferences.job_completed} onCheckedChange={(c) => handleInputChange('notification_preferences', {...formData.notification_preferences, job_completed: c})} />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50">
            <div>
              <Label htmlFor="mention-in-notes" className="font-medium">Mention in Notes</Label>
              <p className="text-sm text-slate-600">Notify me when someone @mentions me in a note.</p>
            </div>
            <Switch id="mention-in-notes" checked={formData.notification_preferences.mention_in_notes} onCheckedChange={(c) => handleInputChange('notification_preferences', {...formData.notification_preferences, mention_in_notes: c})} />
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Save My Settings'}
        </Button>
      </div>
    </div>
  );
}
