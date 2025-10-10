import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X, Pencil, Save } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { CompanyManager } from '@/firebase/schemas';
import { useGlobalData } from '@/components/GlobalDataContext';

export default function InvoiceSettingsPanel() {
  const { user } = useAuth();
  const { companyData, refreshData } = useGlobalData();
  const [invoiceSettings, setInvoiceSettings] = useState({
    invoice_for_printing: false,
    per_page_copy_rate: 0.25,
    tax_on_invoice: false,
    tax_rate: 0,
    service_fee: 75,
    rush_fee: 50,
    emergency_fee: 150,
    invoice_presets: []
  });
  const [isSaving, setIsSaving] = useState(false);

  const [editingPreset, setEditingPreset] = useState(null);
  const [newPreset, setNewPreset] = useState({ description: '', default_amount: '' });

  // Load settings from global context (already loaded at login)
  useEffect(() => {
    if (companyData?.invoice_settings) {
      setInvoiceSettings(companyData.invoice_settings);
    }
  }, [companyData]);

  const handleToggle = (field) => {
    setInvoiceSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleChange = (field, value) => {
    setInvoiceSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddPreset = () => {
    if (!newPreset.description || !newPreset.default_amount) {
      alert('Please enter both description and amount');
      return;
    }

    const preset = {
      id: `preset_${Date.now()}`,
      description: newPreset.description,
      default_amount: parseFloat(newPreset.default_amount)
    };

    setInvoiceSettings(prev => ({
      ...prev,
      invoice_presets: [...(prev.invoice_presets || []), preset]
    }));

    setNewPreset({ description: '', default_amount: '' });
  };

  const handleUpdatePreset = (presetId, field, value) => {
    setInvoiceSettings(prev => ({
      ...prev,
      invoice_presets: prev.invoice_presets.map(preset =>
        preset.id === presetId
          ? { ...preset, [field]: field === 'default_amount' ? parseFloat(value) : value }
          : preset
      )
    }));
  };

  const handleDeletePreset = (presetId) => {
    if (!confirm('Are you sure you want to delete this preset?')) return;

    setInvoiceSettings(prev => ({
      ...prev,
      invoice_presets: prev.invoice_presets.filter(preset => preset.id !== presetId)
    }));
  };

  const handleSave = async () => {
    if (!user?.company_id) {
      alert("No company associated with user");
      return;
    }

    setIsSaving(true);
    try {
      await CompanyManager.updateCompany(user.company_id, {
        invoice_settings: invoiceSettings
      });
      // Refresh global data to update all components using company settings
      await refreshData();
      alert("Invoice settings saved successfully!");
    } catch (error) {
      console.error("Error saving invoice settings:", error);
      alert("Failed to save invoice settings");
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Copy Printing Settings */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Invoice for Printing</Label>
              <p className="text-sm text-slate-500">
                Automatically add copy charges based on document page counts
              </p>
            </div>
            <Switch
              checked={invoiceSettings.invoice_for_printing}
              onCheckedChange={() => handleToggle('invoice_for_printing')}
            />
          </div>

          {invoiceSettings.invoice_for_printing && (
            <div>
              <Label htmlFor="per_page_copy_rate">Per Page Rate ($)</Label>
              <Input
                id="per_page_copy_rate"
                type="number"
                step="0.01"
                value={invoiceSettings.per_page_copy_rate}
                onChange={(e) => handleChange('per_page_copy_rate', parseFloat(e.target.value) || 0)}
                className="max-w-xs"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tax Settings */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Tax on Invoice</Label>
              <p className="text-sm text-slate-500">
                Automatically calculate tax on invoices
              </p>
            </div>
            <Switch
              checked={invoiceSettings.tax_on_invoice}
              onCheckedChange={() => handleToggle('tax_on_invoice')}
            />
          </div>

          {invoiceSettings.tax_on_invoice && (
            <div>
              <Label htmlFor="tax_rate">Tax Rate (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                step="0.1"
                value={invoiceSettings.tax_rate}
                onChange={(e) => handleChange('tax_rate', parseFloat(e.target.value) || 0)}
                className="max-w-xs"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Presets */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold mb-1">Invoice Presets</h3>
            <p className="text-sm text-slate-500">
              Configure default line items for faster invoicing
            </p>
          </div>

          {/* Existing Presets */}
          <div className="space-y-2">
            {invoiceSettings.invoice_presets?.map((preset) => (
              <div key={preset.id} className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg">
                {editingPreset === preset.id ? (
                  <>
                    <Input
                      value={preset.description}
                      onChange={(e) => handleUpdatePreset(preset.id, 'description', e.target.value)}
                      placeholder="Description"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={preset.default_amount}
                      onChange={(e) => handleUpdatePreset(preset.id, 'default_amount', e.target.value)}
                      placeholder="Amount"
                      className="w-32"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setEditingPreset(null)}
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{preset.description}</span>
                    <span className="text-sm font-medium text-slate-900">
                      ${preset.default_amount.toFixed(2)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingPreset(preset.id)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePreset(preset.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add New Preset */}
          <div className="flex items-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg">
            <Input
              value={newPreset.description}
              onChange={(e) => setNewPreset({ ...newPreset, description: e.target.value })}
              placeholder="Description (e.g., Mileage Fee)"
              className="flex-1"
            />
            <Input
              type="number"
              step="0.01"
              value={newPreset.default_amount}
              onChange={(e) => setNewPreset({ ...newPreset, default_amount: e.target.value })}
              placeholder="Amount"
              className="w-32"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddPreset}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Invoice Settings'}
        </Button>
      </div>
    </div>
  );
}
