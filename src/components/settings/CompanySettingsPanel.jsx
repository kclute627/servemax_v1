
import React, { useState, useEffect } from "react";
import { CompanySettings } from "@/api/entities";
import { useAuth } from "@/components/auth/AuthProvider";
import { entities } from "@/firebase/database";
import { DirectoryManager, CompanyManager, COMPANY_TYPES, JOB_TYPES, JOB_TYPE_LABELS, JOB_TYPE_DESCRIPTIONS } from "@/firebase/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, Save, Settings, Share2, Receipt, Building, BookUser, Globe, Phone, Briefcase, ChevronDown, Palette, Upload, X, Image, ListChecks, Lock } from "lucide-react";
import AddressAutocomplete from "../jobs/AddressAutocomplete";
import { useGlobalData } from "@/components/GlobalDataContext";
import { useToast } from "@/components/ui/use-toast";
import { FirebaseStorage } from "@/firebase/storage";

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
    latitude: null,
    longitude: null,
    phone: '',
    email: ''
  });
  const [directorySettings, setDirectorySettings] = useState({
    enabled: false,
    blurb: ''
  });
  const [branding, setBranding] = useState({
    logo_url: '',
    primary_color: '#1e40af',
    accent_color: '#3b82f6',
    email_tagline: '',
    google_review_url: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [enabledJobTypes, setEnabledJobTypes] = useState([JOB_TYPES.PROCESS_SERVING]); // Process serving always enabled

  // Collapsible section states - Company Info open by default, others closed
  const [openSections, setOpenSections] = useState({
    companyInfo: true,
    branding: false,
    jobTypes: false,
    jobSharing: false,
    directory: false,
    kanban: false,
    priorities: false
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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
        latitude: primaryAddress?.lat || companyData.latitude || null,
        longitude: primaryAddress?.lng || companyData.longitude || null,
        phone: companyData.phone || '',
        email: companyData.email || ''
      });

      // Load branding settings
      setBranding({
        logo_url: companyData.branding?.logo_url || '',
        primary_color: companyData.branding?.primary_color || '#1e40af',
        accent_color: companyData.branding?.accent_color || '#3b82f6',
        email_tagline: companyData.branding?.email_tagline || '',
        google_review_url: companyData.branding?.google_review_url || ''
      });

      // Load enabled job types (process_serving is always included)
      const savedJobTypes = companyData.enabled_job_types || [JOB_TYPES.PROCESS_SERVING];
      // Ensure process_serving is always in the list
      if (!savedJobTypes.includes(JOB_TYPES.PROCESS_SERVING)) {
        savedJobTypes.unshift(JOB_TYPES.PROCESS_SERVING);
      }
      setEnabledJobTypes(savedJobTypes);
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
        lat: companyInfo.latitude || null,
        lng: companyInfo.longitude || null,
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

        // Branding settings
        branding: {
          logo_url: branding.logo_url,
          primary_color: branding.primary_color,
          accent_color: branding.accent_color,
          email_tagline: branding.email_tagline,
          google_review_url: branding.google_review_url
        },

        // Enabled job types (ensure process_serving is always included)
        enabled_job_types: enabledJobTypes.includes(JOB_TYPES.PROCESS_SERVING)
          ? enabledJobTypes
          : [JOB_TYPES.PROCESS_SERVING, ...enabledJobTypes],

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
            lat: companyInfo.latitude || null,
            lng: companyInfo.longitude || null,
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
            lat: companyInfo.latitude || null,
            lng: companyInfo.longitude || null,
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
      // Keep existing address2 (suite/unit number)
      city: addressDetails.city || '',
      state: addressDetails.state || '',
      postal_code: addressDetails.postal_code || '',
      county: addressDetails.county || '',
      latitude: addressDetails.latitude || null,
      longitude: addressDetails.longitude || null
    }));
  };

  // Logo upload handler
  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, etc.)",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Logo must be smaller than 2MB",
      });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const result = await FirebaseStorage.uploadFile(
        file,
        `companies/${user.company_id}/branding`,
        { fileName: `logo_${Date.now()}.${file.name.split('.').pop()}` }
      );

      setBranding(prev => ({ ...prev, logo_url: result.url }));
      toast({
        variant: "success",
        title: "Logo uploaded",
        description: "Your company logo has been uploaded. Don't forget to save!",
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
      });
    }
    setIsUploadingLogo(false);
  };

  const removeLogo = () => {
    setBranding(prev => ({ ...prev, logo_url: '' }));
  };

  // Collapsible Card Header component
  const CollapsibleCardHeader = ({ icon: Icon, title, section, isOpen }) => (
    <CollapsibleTrigger asChild>
      <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors rounded-t-lg">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {title}
          </span>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </CardTitle>
      </CardHeader>
    </CollapsibleTrigger>
  );

  return (
    <div className="space-y-6 pb-24">
      {/* Company Information - Open by default */}
      <Collapsible open={openSections.companyInfo} onOpenChange={() => toggleSection('companyInfo')}>
        <Card>
          <CollapsibleCardHeader icon={Building} title="Company Information" section="companyInfo" isOpen={openSections.companyInfo} />
          <CollapsibleContent>
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
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Company Branding - Collapsed by default */}
      <Collapsible open={openSections.branding} onOpenChange={() => toggleSection('branding')}>
        <Card>
          <CollapsibleCardHeader icon={Palette} title="Company Branding" section="branding" isOpen={openSections.branding} />
          <CollapsibleContent>
            <CardContent className="space-y-6">
              <p className="text-sm text-slate-500">
                Customize your company's visual identity for emails, documents, and the client portal.
              </p>

              {/* Logo Upload */}
              <div className="space-y-3">
                <Label>Company Logo</Label>
                <div className="flex items-start gap-4">
                  {branding.logo_url ? (
                    <div className="relative">
                      <div className="w-32 h-32 border rounded-lg overflow-hidden bg-white flex items-center justify-center">
                        <img
                          src={branding.logo_url}
                          alt="Company logo"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={removeLogo}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={isUploadingLogo}
                      />
                      {isUploadingLogo ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" />
                      ) : (
                        <>
                          <Image className="w-8 h-8 text-slate-400 mb-1" />
                          <span className="text-xs text-slate-500">Upload Logo</span>
                        </>
                      )}
                    </label>
                  )}
                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-slate-600">
                      Upload your company logo to display on emails and documents.
                    </p>
                    <ul className="text-xs text-slate-500 space-y-1">
                      <li>• Recommended size: 200x200px or larger</li>
                      <li>• Formats: PNG, JPG, SVG</li>
                      <li>• Max file size: 2MB</li>
                    </ul>
                    {branding.logo_url && (
                      <label className="inline-flex items-center gap-2 text-sm text-blue-600 cursor-pointer hover:underline">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                          disabled={isUploadingLogo}
                        />
                        <Upload className="w-4 h-4" />
                        Replace logo
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="primary_color"
                      value={branding.primary_color}
                      onChange={(e) => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-12 h-10 rounded cursor-pointer border border-slate-200"
                    />
                    <Input
                      value={branding.primary_color}
                      onChange={(e) => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                      placeholder="#1e40af"
                      className="flex-1 font-mono"
                      maxLength={7}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Used for email headers, buttons, and links.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accent_color">Secondary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="accent_color"
                      value={branding.accent_color}
                      onChange={(e) => setBranding(prev => ({ ...prev, accent_color: e.target.value }))}
                      className="w-12 h-10 rounded cursor-pointer border border-slate-200"
                    />
                    <Input
                      value={branding.accent_color}
                      onChange={(e) => setBranding(prev => ({ ...prev, accent_color: e.target.value }))}
                      placeholder="#3b82f6"
                      className="flex-1 font-mono"
                      maxLength={7}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Used for accents and hover states.
                  </p>
                </div>
              </div>

              {/* Quick Color Presets */}
              <div className="space-y-2">
                <Label>Quick Presets</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Blue', primary: '#1e40af', accent: '#3b82f6' },
                    { name: 'Green', primary: '#166534', accent: '#22c55e' },
                    { name: 'Purple', primary: '#7c3aed', accent: '#a78bfa' },
                    { name: 'Red', primary: '#dc2626', accent: '#f87171' },
                    { name: 'Orange', primary: '#ea580c', accent: '#fb923c' },
                    { name: 'Slate', primary: '#334155', accent: '#64748b' },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setBranding(prev => ({
                        ...prev,
                        primary_color: preset.primary,
                        accent_color: preset.accent
                      }))}
                      className="flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm hover:bg-slate-50 transition-colors"
                    >
                      <span
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: preset.primary }}
                      />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h4 className="font-medium text-slate-900">Email Footer Settings</h4>

                <div className="space-y-2">
                  <Label htmlFor="email_tagline">Company Tagline</Label>
                  <Input
                    id="email_tagline"
                    value={branding.email_tagline}
                    onChange={(e) => setBranding(prev => ({ ...prev, email_tagline: e.target.value }))}
                    placeholder="e.g., Professional Process Serving Since 2010"
                  />
                  <p className="text-xs text-slate-500">
                    A short tagline that appears in the footer of all emails sent to your clients.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="google_review_url">Google Review Link</Label>
                  <Input
                    id="google_review_url"
                    type="url"
                    value={branding.google_review_url}
                    onChange={(e) => setBranding(prev => ({ ...prev, google_review_url: e.target.value }))}
                    placeholder="https://g.page/r/your-business/review"
                  />
                  <p className="text-xs text-slate-500">
                    Add your Google Business review link to encourage clients to leave reviews.
                  </p>
                </div>
              </div>

              {/* Preview */}
              <div className="border rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-slate-100 border-b">
                  <p className="text-xs font-medium text-slate-500">EMAIL PREVIEW</p>
                </div>
                <div
                  className="p-6 text-center"
                  style={{ backgroundColor: branding.primary_color }}
                >
                  {branding.logo_url ? (
                    <img
                      src={branding.logo_url}
                      alt="Logo preview"
                      className="h-12 mx-auto object-contain"
                      style={{ filter: 'brightness(0) invert(1)' }}
                    />
                  ) : (
                    <p className="text-white font-semibold text-lg">
                      {companyInfo.company_name || 'Your Company Name'}
                    </p>
                  )}
                </div>
                <div className="p-6 bg-white">
                  <p className="text-slate-600 text-sm mb-4">
                    This is how your email header will appear to clients...
                  </p>
                  <div className="text-center">
                    <button
                      type="button"
                      className="px-6 py-2 rounded text-white font-medium"
                      style={{ backgroundColor: branding.primary_color }}
                    >
                      Sample Button
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border-t text-center space-y-1">
                  {branding.logo_url && (
                    <img
                      src={branding.logo_url}
                      alt="Footer logo"
                      className="h-8 mx-auto object-contain mb-2"
                    />
                  )}
                  <p className="font-semibold text-sm">{companyInfo.company_name || 'Your Company Name'}</p>
                  {branding.email_tagline && (
                    <p className="text-xs italic text-slate-600">{branding.email_tagline}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    {companyInfo.address1 && `${companyInfo.address1}, `}
                    {companyInfo.city && `${companyInfo.city}, `}
                    {companyInfo.state} {companyInfo.postal_code}
                  </p>
                  <div className="flex justify-center gap-4 pt-2">
                    {companyInfo.website && (
                      <span
                        className="text-xs cursor-pointer"
                        style={{ color: branding.primary_color }}
                      >
                        Visit Our Website
                      </span>
                    )}
                    {branding.google_review_url && (
                      <span
                        className="text-xs text-white px-2 py-1 rounded cursor-pointer"
                        style={{ backgroundColor: branding.primary_color }}
                      >
                        Leave Us a Review ⭐
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Job Types - Collapsed by default */}
      <Collapsible open={openSections.jobTypes} onOpenChange={() => toggleSection('jobTypes')}>
        <Card>
          <CollapsibleCardHeader icon={ListChecks} title="Job Types" section="jobTypes" isOpen={openSections.jobTypes} />
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Select which services your company offers. These will be available when creating new jobs.
              </p>

              <div className="space-y-3">
                {/* Process Serving - Always enabled, cannot be disabled */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{JOB_TYPE_LABELS[JOB_TYPES.PROCESS_SERVING]}</span>
                        <Badge variant="secondary" className="text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          Required
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{JOB_TYPE_DESCRIPTIONS[JOB_TYPES.PROCESS_SERVING]}</p>
                    </div>
                  </div>
                  <Switch checked={true} disabled className="opacity-50" />
                </div>

                {/* Court Reporting - Coming Soon */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 opacity-60">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-500">{JOB_TYPE_LABELS[JOB_TYPES.COURT_REPORTING]}</span>
                      <Badge variant="outline" className="text-xs bg-slate-100 text-slate-500 border-slate-300">
                        Coming Soon
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{JOB_TYPE_DESCRIPTIONS[JOB_TYPES.COURT_REPORTING]}</p>
                  </div>
                  <Switch checked={false} disabled className="opacity-50" />
                </div>

                {/* E-filing - Coming Soon */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 opacity-60">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-500">{JOB_TYPE_LABELS[JOB_TYPES.EFILING]}</span>
                      <Badge variant="outline" className="text-xs bg-slate-100 text-slate-500 border-slate-300">
                        Coming Soon
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{JOB_TYPE_DESCRIPTIONS[JOB_TYPES.EFILING]}</p>
                  </div>
                  <Switch checked={false} disabled className="opacity-50" />
                </div>

                {/* Document Retrieval - Coming Soon */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 opacity-60">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-500">{JOB_TYPE_LABELS[JOB_TYPES.DOCUMENT_RETRIEVAL]}</span>
                      <Badge variant="outline" className="text-xs bg-slate-100 text-slate-500 border-slate-300">
                        Coming Soon
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{JOB_TYPE_DESCRIPTIONS[JOB_TYPES.DOCUMENT_RETRIEVAL]}</p>
                  </div>
                  <Switch checked={false} disabled className="opacity-50" />
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-4">
                Additional job types will be available in job creation once enabled.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Job Sharing - Collapsed by default */}
      <Collapsible open={openSections.jobSharing} onOpenChange={() => toggleSection('jobSharing')}>
        <Card>
          <CollapsibleCardHeader icon={Share2} title="Job Sharing" section="jobSharing" isOpen={openSections.jobSharing} />
          <CollapsibleContent>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base font-medium">Open to accept jobs from ServeMax users</div>
                  <p className="text-sm text-slate-500">Allow other ServeMax users to send you jobs.</p>
                </div>
                <Switch checked={jobSharingEnabled} onCheckedChange={setJobSharingEnabled} />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Directory Settings - Collapsed by default */}
      <Collapsible open={openSections.directory} onOpenChange={() => toggleSection('directory')}>
        <Card>
          <CollapsibleCardHeader icon={BookUser} title="ServeMax Directory" section="directory" isOpen={openSections.directory} />
          <CollapsibleContent>
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
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Kanban Board Configuration - Collapsed by default */}
      <Collapsible open={openSections.kanban} onOpenChange={() => toggleSection('kanban')}>
        <Card>
          <CollapsibleCardHeader icon={Briefcase} title="Kanban Board" section="kanban" isOpen={openSections.kanban} />
          <CollapsibleContent>
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
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Job Priorities - Collapsed by default */}
      <Collapsible open={openSections.priorities} onOpenChange={() => toggleSection('priorities')}>
        <Card>
          <CollapsibleCardHeader icon={Settings} title="Job Priorities" section="priorities" isOpen={openSections.priorities} />
          <CollapsibleContent>
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
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Sticky Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-10">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-4 flex justify-end items-center">
          <Button onClick={saveSettings} disabled={isSaving} className="gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
