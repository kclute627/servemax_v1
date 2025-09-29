
import React, { useState, useEffect } from "react";
// FIREBASE TRANSITION: This component interacts with the 'company_settings' collection.
// - `loadSettings`: Replace `CompanySettings.filter()` with `getDocs` on a query for specific setting keys.
// - `saveSettings`: Replace `CompanySettings.update()`/`create()` with Firestore `updateDoc`/`setDoc`.
import { CompanySettings } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Import Textarea
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, Settings, Share2, Receipt, Building, BookUser } from "lucide-react"; // Added 'BookUser' icon
import AddressAutocomplete from "../jobs/AddressAutocomplete";

export default function CompanySettingsPanel() {
  const [priorities, setPriorities] = useState([
    { name: "standard", label: "Standard", days_offset: 14, first_attempt_days: 3 },
    { name: "rush", label: "Rush", days_offset: 2, first_attempt_days: 1 },
    { name: "same_day", label: "Same Day", days_offset: 0, first_attempt_days: 0 }
  ]);
  const [jobSharingEnabled, setJobSharingEnabled] = useState(false);
  const [invoiceForPrintingEnabled, setInvoiceForPrintingEnabled] = useState(false);
  const [printingFeePerPage, setPrintingFeePerPage] = useState(0.10);
  const [invoicePresets, setInvoicePresets] = useState([
    { description: "Routine Service", rate: 75.00 },
    { description: "Rush Fee", rate: 25.00 },
    { description: "Mileage", rate: 0.65 }
  ]);
  // REMOVED: Kanban columns state is no longer managed here.
  const [companyInfo, setCompanyInfo] = useState({
    company_name: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postal_code: '',
    phone: '',
    email: ''
  });
  // New state for directory settings
  const [directorySettings, setDirectorySettings] = useState({
    enabled: true,
    blurb: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // FIREBASE TRANSITION: Fetch multiple settings documents from Firestore.
      const [prioritySettings, jobSharingSettings, invoiceSettings, companyInfoSettings, directorySettingsData] = await Promise.all([
        CompanySettings.filter({ setting_key: "job_priorities" }),
        CompanySettings.filter({ setting_key: "job_sharing" }),
        CompanySettings.filter({ setting_key: "invoice_settings" }),
        // REMOVED: No longer fetching "kanban_settings" here.
        CompanySettings.filter({ setting_key: "company_information" }),
        CompanySettings.filter({ setting_key: "directory_settings" }) // Fetch new directory settings
      ]);
      
      if (prioritySettings.length > 0) {
        const loadedPriorities = prioritySettings[0].setting_value.priorities.map(p => ({
          ...p,
          // Ensure 'name' field exists, even if not directly editable in UI
          name: p.name || "", 
          first_attempt_days: p.first_attempt_days !== undefined ? p.first_attempt_days : 0
        }));
        setPriorities(loadedPriorities);
      }

      if (jobSharingSettings.length > 0) {
        setJobSharingEnabled(jobSharingSettings[0].setting_value.enabled || false);
      }
      
      if (invoiceSettings.length > 0) {
        const settingsValue = invoiceSettings[0].setting_value;
        setInvoiceForPrintingEnabled(settingsValue.enabled || false);
        setPrintingFeePerPage(settingsValue.fee_per_page !== undefined ? settingsValue.fee_per_page : 0.10);
        if (Array.isArray(settingsValue.presets) && settingsValue.presets.length > 0) {
          setInvoicePresets(settingsValue.presets);
        }
      }

      // REMOVED: Logic to load Kanban settings.

      if (companyInfoSettings.length > 0) {
        setCompanyInfo(companyInfoSettings[0].setting_value || {
          company_name: '',
          address1: '',
          address2: '',
          city: '',
          state: '',
          postal_code: '',
          phone: '',
          email: ''
        });
      }

      // Load directory settings
      if (directorySettingsData.length > 0) {
        setDirectorySettings(directorySettingsData[0].setting_value || { enabled: true, blurb: '' });
      }

    } catch (error) {
      console.error("Error loading settings:", error);
    }
    setIsLoading(false);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // FIREBASE TRANSITION: These checks and updates will be Firestore transactions or batched writes.
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

      const existingInvoiceSettings = await CompanySettings.filter({ setting_key: "invoice_settings" });
      const invoiceSettingsValue = { enabled: invoiceForPrintingEnabled, fee_per_page: printingFeePerPage, presets: invoicePresets };
      if (existingInvoiceSettings.length > 0) {
        await CompanySettings.update(existingInvoiceSettings[0].id, { setting_value: invoiceSettingsValue });
      } else {
        await CompanySettings.create({ setting_key: "invoice_settings", setting_value: invoiceSettingsValue });
      }

      // REMOVED: Logic to save Kanban settings.

      const existingCompanyInfoSettings = await CompanySettings.filter({ setting_key: "company_information" });
      if (existingCompanyInfoSettings.length > 0) {
        await CompanySettings.update(existingCompanyInfoSettings[0].id, { setting_value: companyInfo });
      } else {
        await CompanySettings.create({ setting_key: "company_information", setting_value: companyInfo });
      }

      // Save new directory settings
      const existingDirectorySettings = await CompanySettings.filter({ setting_key: "directory_settings" });
      if (existingDirectorySettings.length > 0) {
        await CompanySettings.update(existingDirectorySettings[0].id, { setting_value: directorySettings });
      } else {
        await CompanySettings.create({ setting_key: "directory_settings", setting_value: directorySettings });
      }

      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
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

  const addInvoicePreset = () => setInvoicePresets([...invoicePresets, { description: "", rate: 0.00 }]);
  const removeInvoicePreset = (index) => setInvoicePresets(invoicePresets.filter((_, i) => i !== index));
  const updateInvoicePreset = (index, field, value) => {
    const updated = [...invoicePresets];
    updated[index][field] = field === 'rate' ? parseFloat(value) || 0 : value;
    setInvoicePresets(updated);
  };

  // REMOVED: All Kanban column management functions (`addKanbanColumn`, `updateKanbanColumn`, `removeKanbanColumn`) are gone.
  
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <p className="text-sm text-slate-500">Allow other ServeMax users to find your company for collaboration.</p>
            </div>
            <Switch checked={directorySettings.enabled} onCheckedChange={(checked) => updateDirectorySettings('enabled', checked)} />
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" />Invoice Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-base font-medium">Invoice For Printing</div>
                <p className="text-sm text-slate-500">Automatically add a printing cost line item.</p>
              </div>
              <Switch checked={invoiceForPrintingEnabled} onCheckedChange={setInvoiceForPrintingEnabled} />
            </div>
            {invoiceForPrintingEnabled && (
              <div className="pt-4 mt-4 border-t">
                <Label htmlFor="printing-fee">Printing Fee Per Page ($)</Label>
                <Input 
                  id="printing-fee" 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  value={printingFeePerPage} 
                  onChange={(e) => setPrintingFeePerPage(parseFloat(e.target.value) || 0)} 
                  className="w-48 mt-1"
                  autoComplete="off"
                />
              </div>
            )}
          </div>

          <div className="pt-6 border-t">
            <h4 className="font-semibold text-slate-900 mb-1">Invoice Presets</h4>
            <p className="text-sm text-slate-600">Configure default line items for faster invoicing.</p>
            <div className="space-y-3 mt-4">
              {invoicePresets.map((preset, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Input 
                      value={preset.description} 
                      onChange={(e) => updateInvoicePreset(index, 'description', e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label>Default Rate ($)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      value={preset.rate} 
                      onChange={(e) => updateInvoicePreset(index, 'rate', e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={() => removeInvoicePreset(index)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={addInvoicePreset} className="gap-2 mt-4"><Plus className="w-4 h-4" />Add Preset</Button>
          </div>
        </CardContent>
      </Card>

      {/* REMOVED: The entire "Kanban Board Configuration" card has been deleted from this file. */}

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
