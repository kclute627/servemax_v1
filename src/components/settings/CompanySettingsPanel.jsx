
import React, { useState, useEffect } from "react";
import { CompanySettings } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, Settings, Share2, Receipt, Columns, GripVertical } from "lucide-react";

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
  const [kanbanColumns, setKanbanColumns] = useState([
    { id: "backlog", title: "Backlog", associated_statuses: ["pending"], order: 1 },
    { id: "assigned", title: "Assigned", associated_statuses: ["assigned"], order: 2 },
    { id: "in_progress", title: "In Progress", associated_statuses: ["in_progress"], order: 3 },
    { id: "completed", title: "Completed", associated_statuses: ["served"], order: 4 },
    { id: "unable", title: "Unable to Serve", associated_statuses: ["unable_to_serve", "cancelled"], order: 5 }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const [prioritySettings, jobSharingSettings, invoiceSettings, kanbanSettings] = await Promise.all([
        CompanySettings.filter({ setting_key: "job_priorities" }),
        CompanySettings.filter({ setting_key: "job_sharing" }),
        CompanySettings.filter({ setting_key: "invoice_settings" }),
        CompanySettings.filter({ setting_key: "kanban_settings" })
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

      if (kanbanSettings.length > 0 && kanbanSettings[0].setting_value.columns) {
        setKanbanColumns(kanbanSettings[0].setting_value.columns);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
    setIsLoading(false);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
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

      const existingKanbanSettings = await CompanySettings.filter({ setting_key: "kanban_settings" });
      const kanbanSettingsValue = { columns: kanbanColumns };
      if (existingKanbanSettings.length > 0) {
        await CompanySettings.update(existingKanbanSettings[0].id, { setting_value: kanbanSettingsValue });
      } else {
        await CompanySettings.create({ setting_key: "kanban_settings", setting_value: kanbanSettingsValue });
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

  // Kanban column management functions
  const addKanbanColumn = () => {
    const newColumn = {
      id: `column_${Date.now()}`,
      title: "New Column",
      associated_statuses: ["pending"],
      order: kanbanColumns.length + 1
    };
    setKanbanColumns([...kanbanColumns, newColumn]);
  };

  const updateKanbanColumn = (index, field, value) => {
    const updated = [...kanbanColumns];
    updated[index][field] = value;
    setKanbanColumns(updated);
  };

  const removeKanbanColumn = (index) => {
    setKanbanColumns(kanbanColumns.filter((_, i) => i !== index));
  };

  const availableStatuses = [
    { value: "pending", label: "Pending" },
    { value: "assigned", label: "Assigned" },
    { value: "in_progress", label: "In Progress" },
    { value: "served", label: "Served" },
    { value: "unable_to_serve", label: "Unable to Serve" },
    { value: "cancelled", label: "Cancelled" }
  ];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
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
                <Input id="printing-fee" type="number" step="0.01" min="0" value={printingFeePerPage} onChange={(e) => setPrintingFeePerPage(parseFloat(e.target.value) || 0)} className="w-48 mt-1" />
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
                    <Input value={preset.description} onChange={(e) => updateInvoicePreset(index, 'description', e.target.value)} />
                  </div>
                  <div>
                    <Label>Default Rate ($)</Label>
                    <Input type="number" step="0.01" min="0" value={preset.rate} onChange={(e) => updateInvoicePreset(index, 'rate', e.target.value)} />
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={() => removeInvoicePreset(index)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={addInvoicePreset} className="gap-2 mt-4"><Plus className="w-4 h-4" />Add Preset</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Columns className="w-5 h-5" />Kanban Board Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">Configure columns for the Kanban board view on the Jobs page.</p>
          
          <div className="space-y-4">
            {kanbanColumns.map((column, index) => (
              <div key={column.id} className="p-4 border rounded-lg bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <Label>Column Title</Label>
                    <Input 
                      value={column.title} 
                      onChange={(e) => updateKanbanColumn(index, 'title', e.target.value)} 
                      placeholder="e.g., In Progress"
                    />
                  </div>
                  <div>
                    <Label>Associated Job Statuses</Label>
                    <select
                      multiple
                      value={column.associated_statuses}
                      onChange={(e) => {
                        const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
                        updateKanbanColumn(index, 'associated_statuses', selectedValues);
                      }}
                      className="flex h-20 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {availableStatuses.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    onClick={() => removeKanbanColumn(index)} 
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="outline">Order: {column.order}</Badge>
                  <div className="flex gap-1 flex-wrap">
                    {column.associated_statuses.map(status => (
                      <Badge key={status} className="bg-blue-100 text-blue-700 text-xs">
                        {availableStatuses.find(s => s.value === status)?.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <Button type="button" variant="outline" onClick={addKanbanColumn} className="gap-2 mt-4">
            <Plus className="w-4 h-4" />Add Column
          </Button>
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
                    <Input value={priority.label} onChange={(e) => updatePriority(index, 'label', e.target.value)} />
                  </div>
                  <div>
                    <Label>Final Due Days</Label>
                    <Input type="number" value={priority.days_offset} onChange={(e) => updatePriority(index, 'days_offset', e.target.value)} min="0" />
                  </div>
                  <div>
                    <Label>First Attempt Days</Label>
                    <Input type="number" value={priority.first_attempt_days} onChange={(e) => updatePriority(index, 'first_attempt_days', e.target.value)} min="0" />
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
