
import React, { useState, useEffect } from "react";
import { CompanySettings } from "@/api/entities";
import { useAuth } from "@/components/auth/AuthProvider";
import { entities } from "@/firebase/database";
import { DirectoryManager, CompanyManager, COMPANY_TYPES } from "@/firebase/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Import Textarea
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, Settings, Share2, Receipt, Building, BookUser, Globe, Phone, Briefcase } from "lucide-react";
import AddressAutocomplete from "../jobs/AddressAutocomplete";
import { useGlobalData } from "@/components/GlobalDataContext";
import { useToast } from "@/components/ui/use-toast";

export default function CompanySettingsPanel() {
  const { user } = useAuth();
  const { companyData, companySettings, refreshData } = useGlobalData();
  const { toast } = useToast();
  const [priorities, setPriorities] = useState([]);
  const [jobSharingEnabled, setJobSharingEnabled] = useState(false);
  const [kanbanBoard, setKanbanBoard] = useState({
    enabled: true,
    columns: []
  });
  const [companyInfo, setCompanyInfo] = useState({
    company_name: '',
    website: '',
    fax: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postal_code: '',
    county: '',
    phone: '',
    email: ''
  });
  const [directorySettings, setDirectorySettings] = useState({
    enabled: false,
    blurb: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);

  // Load settings from global context (already loaded at login)
  useEffect(() => {
    if (companyData) {
      // Get primary address from addresses array or fallback to legacy fields
      const primaryAddress = companyData.addresses?.find(addr => addr.primary) || companyData.addresses?.[0];

      setCompanyInfo({
        company_name: companyData.name || '',
        website: companyData.website || '',
        fax: companyData.fax || '',
        address1: primaryAddress?.address1 || companyData.address || '',
        address2: primaryAddress?.address2 || '',
        city: primaryAddress?.city || companyData.city || '',
        state: primaryAddress?.state || companyData.state || '',
        postal_code: primaryAddress?.postal_code || companyData.zip || '',
        county: primaryAddress?.county || companyData.county || '',
        phone: companyData.phone || '',
        email: companyData.email || ''
      });
    }
  }, [companyData]);

  useEffect(() => {
    if (companySettings) {
      setPriorities(companySettings.priorities || []);
      setJobSharingEnabled(companySettings.jobSharingEnabled || false);

      // Load kanban settings with defaults if none exist
      if (companySettings.kanbanBoard) {
        setKanbanBoard(companySettings.kanbanBoard);
      } else {
        // Provide default kanban columns with UUIDs
        setKanbanBoard({
          enabled: true,
          columns: [
            { id: crypto.randomUUID(), title: 'Pending', order: 0 },
            { id: crypto.randomUUID(), title: 'Assigned', order: 1 },
            { id: crypto.randomUUID(), title: 'In Progress', order: 2 },
            { id: crypto.randomUUID(), title: 'Served', order: 3 },
            { id: crypto.randomUUID(), title: 'Needs Affidavit', order: 4 },
            { id: crypto.randomUUID(), title: 'Unable to Serve', order: 5 },
            { id: crypto.randomUUID(), title: 'Cancelled', order: 6 },
          ]
        });
      }

      if (companySettings.directoryListing) {
        setDirectorySettings({
          enabled: companySettings.directoryListing.is_active || false,
          blurb: companySettings.directoryListing.blurb || ''
        });
      } else if (companyData?.collaboration_settings?.directory_listing_enabled) {
        setDirectorySettings({
          enabled: companyData.collaboration_settings.directory_listing_enabled,
          blurb: ''
        });
      }
    }
  }, [companySettings, companyData]);

  const saveSettings = async () => {
    if (!user?.company_id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No company associated with user",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Create updated address object
      const updatedAddress = {
        label: "Primary",
        address1: companyInfo.address1,
        address2: companyInfo.address2,
        city: companyInfo.city,
        state: companyInfo.state,
        postal_code: companyInfo.postal_code,
        county: companyInfo.county,
        lat: null, // Will be geocoded later if needed
        lng: null, // Will be geocoded later if needed
        primary: true,
        created_at: companyData?.addresses?.[0]?.created_at || new Date(),
        updated_at: new Date()
      };

      // Update company information in the companies collection
      const companyUpdateData = {
        name: companyInfo.company_name,
        email: companyInfo.email,
        phone: companyInfo.phone,
        website: companyInfo.website,
        fax: companyInfo.fax,

        // Legacy address fields (for backward compatibility)
        address: companyInfo.address1,
        city: companyInfo.city,
        state: companyInfo.state,
        zip: companyInfo.postal_code,
        county: companyInfo.county,

        // Enhanced address system
        addresses: [updatedAddress],

        collaboration_settings: {
          ...companyData?.collaboration_settings,
          directory_listing_enabled: directorySettings.enabled
        },
        updated_at: new Date()
      };

      await CompanyManager.updateCompany(user.company_id, companyUpdateData);

      // Save/update directory listing if enabled
      if (directorySettings.enabled) {
        // Check if directory listing exists
        const existingDirectoryListing = await DirectoryManager.getDirectoryListing(user.company_id);

        if (existingDirectoryListing) {
          // Update existing directory listing with blurb
          await DirectoryManager.updateDirectoryListing(user.company_id, {
            // Keep other existing data first
            ...existingDirectoryListing,
            // Then override with new values (including blurb) - ORDER MATTERS!
            blurb: directorySettings.blurb,
            name: companyInfo.company_name,
            email: companyInfo.email,
            phone: companyInfo.phone,
            address: companyInfo.address1,
            city: companyInfo.city,
            state: companyInfo.state,
            zip: companyInfo.postal_code,
            is_active: true
          });
        } else {
          // Create new directory listing
          const companyType = user.user_type === 'independent_contractor'
            ? COMPANY_TYPES.INDEPENDENT_CONTRACTOR
            : COMPANY_TYPES.PROCESS_SERVING;

          await DirectoryManager.addToDirectory(user.company_id, {
            company_type: companyType,
            name: companyInfo.company_name,
            email: companyInfo.email,
            phone: companyInfo.phone,
            address: companyInfo.address1,
            city: companyInfo.city,
            state: companyInfo.state,
            zip: companyInfo.postal_code,
            blurb: directorySettings.blurb,
            is_active: true
          });
        }
      } else {
        // Disable directory listing if it exists
        const existingDirectoryListing = await DirectoryManager.getDirectoryListing(user.company_id);
        if (existingDirectoryListing) {
          await DirectoryManager.updateDirectoryListing(user.company_id, {
            is_active: false
          });
        }
      }

      // Save other settings to CompanySettings collection
      const existingPrioritySettings = await CompanySettings.filter({ setting_key: "job_priorities" });
      if (existingPrioritySettings.length > 0) {
        await CompanySettings.update(existingPrioritySettings[0].id, { setting_value: { priorities } });
      } else {
        await CompanySettings.create({ setting_key: "job_priorities", setting_value: { priorities } });
      }

      const existingJobSharingSettings = await CompanySettings.filter({ setting_key: "job_sharing" });
      if (existingJobSharingSettings.length > 0) {
        await CompanySettings.update(existingJobSharingSettings[0].id, { setting_value: { enabled: jobSharingEnabled } });
      } else {
        await CompanySettings.create({ setting_key: "job_sharing", setting_value: { enabled: jobSharingEnabled } });
      }

      // Save kanban board settings
      const existingKanbanSettings = await CompanySettings.filter({ setting_key: "kanban_board" });
      if (existingKanbanSettings.length > 0) {
        await CompanySettings.update(existingKanbanSettings[0].id, { setting_value: kanbanBoard });
      } else {
        await CompanySettings.create({ setting_key: "kanban_board", setting_value: kanbanBoard });
      }

      // Refresh global data to update all components
      await refreshData();
      toast({
        variant: "success",
        title: "Settings saved successfully",
        description: "Your company settings have been updated",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings",
      });
    }
    setIsSaving(false);
  };

  // When adding a new priority, 'name' is initialized as an empty string.
  // This 'name' field is meant for internal system identification and is not exposed to the user for editing.
  // The system itself should manage assigning a unique internal 'name' if necessary
  // or use the 'label' as the internal identifier if 'name' is not strictly required to be unique and different.
  const addPriority = () => setPriorities([...priorities, { name: "", label: "", days_offset: 7, first_attempt_days: 2 }]);
  const removePriority = (index) => setPriorities(priorities.filter((_, i) => i !== index));
  const updatePriority = (index, field, value) => {
    const updated = [...priorities];
    updated[index][field] = (field === 'days_offset' || field === 'first_attempt_days') ? parseInt(value) || 0 : value;
    setPriorities(updated);
  };

  // Kanban column management functions
  const addKanbanColumn = () => {
    const newColumn = {
      id: crypto.randomUUID(),
      title: '',
      order: kanbanBoard.columns.length
    };
    setKanbanBoard(prev => ({
      ...prev,
      columns: [...prev.columns, newColumn]
    }));
  };

  const updateKanbanColumn = (index, field, value) => {
    const updated = [...kanbanBoard.columns];
    updated[index][field] = value;
    setKanbanBoard(prev => ({ ...prev, columns: updated }));
  };

  const removeKanbanColumn = (index) => {
    const updated = kanbanBoard.columns.filter((_, i) => i !== index);
    // Reorder remaining columns
    const reordered = updated.map((col, i) => ({ ...col, order: i }));
    setKanbanBoard(prev => ({ ...prev, columns: reordered }));
  };
  
  const availableStatuses = [
    { value: "pending", label: "Pending" },
    { value: "assigned", label: "Assigned" },
    { value: "in_progress", label: "In Progress" },
    { value: "served", label: "Served" },
    { value: "unable_to_serve", label: "Unable to Serve" },
    { value: "cancelled", label: "Cancelled" }
  ];

  const updateCompanyInfo = (field, value) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }));
  };

  // New handler for directory settings
  const updateDirectorySettings = (field, value) => {
    setDirectorySettings(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressSelect = (addressDetails) => {
    setCompanyInfo(prev => ({
      ...prev,
      address1: addressDetails.address1 || '',
      city: addressDetails.city || '',
      state: addressDetails.state || '',
      postal_code: addressDetails.postal_code || '',
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5" />Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 mb-4">This information will be available to include on affidavits and other documents.</p>
          
          <div>
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={companyInfo.company_name}
              onChange={(e) => updateCompanyInfo('company_name', e.target.value)}
              placeholder="Your Company Name"
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                type="url"
                value={companyInfo.website}
                onChange={(e) => updateCompanyInfo('website', e.target.value)}
                placeholder="www.yourcompany.com"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="fax">Fax (Optional)</Label>
              <Input
                id="fax"
                type="tel"
                value={companyInfo.fax}
                onChange={(e) => updateCompanyInfo('fax', e.target.value)}
                placeholder="(555) 123-4567"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="address1">Street Address</Label>
              <AddressAutocomplete
                id="address1"
                value={companyInfo.address1}
                onChange={(value) => updateCompanyInfo('address1', value)}
                onAddressSelect={handleAddressSelect}
                onLoadingChange={setIsAddressLoading}
                placeholder="Start typing your address..."
              />
            </div>
            <div>
              <Label htmlFor="address2">Suite/Unit</Label>
              <Input 
                id="address2"
                value={companyInfo.address2} 
                onChange={(e) => updateCompanyInfo('address2', e.target.value)} 
                placeholder="Suite 100"
                autoComplete="off"
                disabled={isAddressLoading}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={companyInfo.city}
                onChange={(e) => updateCompanyInfo('city', e.target.value)}
                placeholder="Anytown"
                autoComplete="off"
                disabled={isAddressLoading}
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={companyInfo.state}
                onChange={(e) => updateCompanyInfo('state', e.target.value)}
                placeholder="CA"
                autoComplete="off"
                disabled={isAddressLoading}
              />
            </div>
            <div>
              <Label htmlFor="postal_code">ZIP Code</Label>
              <Input
                id="postal_code"
                value={companyInfo.postal_code}
                onChange={(e) => updateCompanyInfo('postal_code', e.target.value)} 
                placeholder="12345"
                autoComplete="off"
                disabled={isAddressLoading}
              />
            </div>
            <div>
              <Label htmlFor="county">County</Label>
              <Input
                id="county"
                value={companyInfo.county}
                onChange={(e) => updateCompanyInfo('county', e.target.value)}
                placeholder="Los Angeles County"
                autoComplete="off"
                disabled={isAddressLoading}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone"
                value={companyInfo.phone} 
                onChange={(e) => updateCompanyInfo('phone', e.target.value)} 
                placeholder="(555) 123-4567"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email"
                value={companyInfo.email} 
                onChange={(e) => updateCompanyInfo('email', e.target.value)} 
                placeholder="info@company.com"
                autoComplete="off"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Share2 className="w-5 h-5" />Job Sharing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-medium">Open to accept jobs from ServeMax users</div>
              <p className="text-sm text-slate-500">Allow other ServeMax users to send you jobs.</p>
            </div>
            <Switch checked={jobSharingEnabled} onCheckedChange={setJobSharingEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* New Directory Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookUser className="w-5 h-5" />ServeMax Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-medium">Add company to the ServeMax Directory</div>
              <p className="text-sm text-slate-500">
                {companyData?.company_type === COMPANY_TYPES.CLIENT
                  ? "Directory listings are only available for process serving companies and independent contractors."
                  : "Allow other ServeMax users to find your company for collaboration."
                }
              </p>
            </div>
            <Switch
              checked={directorySettings.enabled}
              onCheckedChange={(checked) => updateDirectorySettings('enabled', checked)}
              disabled={companyData?.company_type === COMPANY_TYPES.CLIENT}
            />
          </div>
          {directorySettings.enabled && (
            <div className="pt-4 mt-4 border-t">
              <Label htmlFor="directory-blurb">Company Blurb</Label>
              <Textarea
                id="directory-blurb"
                value={directorySettings.blurb}
                onChange={(e) => updateDirectorySettings('blurb', e.target.value)}
                placeholder="Write a short description about your company, services, and coverage area..."
                className="mt-1"
                maxLength={250}
              />
              <p className="text-xs text-slate-500 mt-1 text-right">{250 - (directorySettings.blurb?.length || 0)} characters remaining</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* REMOVED: Invoice Settings moved to InvoiceSettingsPanel.jsx */}

      {/* Kanban Board Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5" />Kanban Board</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-medium">Enable Kanban View</div>
              <p className="text-sm text-slate-500">Allow users to view and manage jobs using a kanban board.</p>
            </div>
            <Switch
              checked={kanbanBoard.enabled}
              onCheckedChange={(checked) => setKanbanBoard(prev => ({ ...prev, enabled: checked }))}
            />
          </div>

          {kanbanBoard.enabled && (
            <div className="pt-4 border-t">
              <p className="text-sm text-slate-600 mb-4">Configure kanban board columns. Jobs will be organized by these status columns.</p>
              <div className="space-y-4">
                {kanbanBoard.columns.map((column, index) => (
                  <div key={column.id} className="p-4 border rounded-lg bg-slate-50 flex items-center gap-4">
                    <div className="flex-1">
                      <Label>Column Title</Label>
                      <Input
                        value={column.title}
                        onChange={(e) => updateKanbanColumn(index, 'title', e.target.value)}
                        placeholder="e.g. Pending, In Progress, etc."
                        autoComplete="off"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeKanbanColumn(index)}
                      className="text-red-600 mt-6"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addKanbanColumn}
                className="gap-2 mt-4"
              >
                <Plus className="w-4 h-4" />
                Add Column
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" />Job Priorities</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">Configure priority levels and automatic due dates.</p>
          <div className="space-y-4">
            {priorities.map((priority, index) => (
              <div key={index} className="p-4 border rounded-lg bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <Label>Display Label</Label>
                    <Input 
                      value={priority.label} 
                      onChange={(e) => updatePriority(index, 'label', e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label>Final Due Days</Label>
                    <Input 
                      type="number" 
                      value={priority.days_offset} 
                      onChange={(e) => updatePriority(index, 'days_offset', e.target.value)} 
                      min="0"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label>First Attempt Days</Label>
                    <Input 
                      type="number" 
                      value={priority.first_attempt_days} 
                      onChange={(e) => updatePriority(index, 'first_attempt_days', e.target.value)} 
                      min="0"
                      autoComplete="off"
                    />
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={() => removePriority(index)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <Badge variant="outline">Final Due: {priority.days_offset} days</Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">First Attempt: {priority.first_attempt_days} days</Badge>
                </div>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={addPriority} className="gap-2 mt-4"><Plus className="w-4 h-4" />Add Priority</Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isSaving} className="gap-2"><Save className="w-4 h-4" />{isSaving ? 'Saving...' : 'Save Settings'}</Button>
      </div>
    </div>
  );
}
