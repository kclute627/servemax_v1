
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, Save, Loader2, UserCircle, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import ESignatureSection from "./ESignatureSection";

export default function UserSettingsPanel() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    license_number: '',
    service_areas_text: '',
    notification_preferences: {
      job_assigned: true,
      job_completed: false,
      mention_in_notes: true,
    },
  });
  const [originalFormData, setOriginalFormData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Check if form has unsaved changes
  const hasChanges = originalFormData && JSON.stringify(formData) !== JSON.stringify(originalFormData);

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
        
        const initialData = {
          first_name: firstName,
          last_name: lastName,
          license_number: currentUser.license_number || '',
          service_areas_text: (currentUser.service_areas || []).join(', '),
          notification_preferences: currentUser.notification_preferences || { job_assigned: true, job_completed: false, mention_in_notes: true }
        };

        setFormData(initialData);
        setOriginalFormData(initialData);

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
        service_areas: service_areas,
        notification_preferences: formData.notification_preferences,
      });

      // Update original data to mark as saved
      setOriginalFormData(formData);

      toast({
        variant: "success",
        title: "Settings saved successfully",
        description: "Your personal settings have been updated",
      });
    } catch (error) {
      console.error("Failed to save user settings:", error);
      toast({
        variant: "destructive",
        title: "Error saving settings",
        description: "An error occurred while saving your settings. Please try again.",
      });
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
    <div className="space-y-6 pb-24">
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

      {/* Sticky Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-10">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-4 flex justify-end items-center">
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="gap-2 relative"
          >
            {hasChanges && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse border-2 border-white"></span>
            )}
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving...' : 'Save My Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
