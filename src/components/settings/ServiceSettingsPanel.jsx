
import React, { useState, useEffect } from 'react';
import { CompanySettings } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch'; // Added Switch import
import { Loader2, Plus, Trash2, Save, CheckCircle, AlertCircle, Settings } from 'lucide-react'; // Added Settings import

// Simple UUID generator to replace nanoid
const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const defaultSettings = {
  successful: [
    { id: generateId(), label: 'Personal / Individual' },
    { id: generateId(), label: 'Substitute Service' },
    { id: generateId(), label: 'Authorized Agent' },
    { id: generateId(), label: 'Corporate Service' },
  ],
  unsuccessful: [
    { id: generateId(), label: 'Unsuccessful Attempt' },
    { id: generateId(), label: 'Non-Serve - Bad Address' },
    { id: generateId(), label: 'Non-Serve - Moved' },
    { id: generateId(), label: 'Non-Serve - Evading Service' },
  ],
  show_description_buttons: true // Add default for new toggle
};

export default function ServiceSettingsPanel() {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsId, setSettingsId] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const result = await CompanySettings.filter({ setting_key: 'service_types' });
        if (result && result.length > 0) {
          const fetched = result[0];
          // Ensure IDs exist for all items and include show_description_buttons setting
          const validatedSettings = {
            successful: fetched.setting_value.successful?.map(item => ({ ...item, id: item.id || generateId() })) || [],
            unsuccessful: fetched.setting_value.unsuccessful?.map(item => ({ ...item, id: item.id || generateId() })) || [],
            show_description_buttons: fetched.setting_value.show_description_buttons !== false // Default to true if not set
          };
          setSettings(validatedSettings);
          setSettingsId(fetched.id);
        } else {
          setSettings(defaultSettings);
        }
      } catch (error) {
        console.error("Error fetching service type settings:", error);
        setSettings(defaultSettings);
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dataToSave = {
        setting_key: 'service_types',
        setting_value: settings, // This now includes show_description_buttons
      };

      if (settingsId) {
        await CompanySettings.update(settingsId, dataToSave);
      } else {
        const newSetting = await CompanySettings.create(dataToSave);
        setSettingsId(newSetting.id);
      }
      
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings: " + error.message);
    }
    setIsSaving(false);
  };

  const handleAddItem = (type) => {
    setSettings(prev => ({
      ...prev,
      [type]: [...prev[type], { id: generateId(), label: '' }]
    }));
  };

  const handleRemoveItem = (type, idToRemove) => {
    setSettings(prev => ({
      ...prev,
      [type]: prev[type].filter(item => item.id !== idToRemove)
    }));
  };

  const handleItemChange = (type, id, newLabel) => {
    setSettings(prev => ({
      ...prev,
      [type]: prev[type].map(item => item.id === id ? { ...item, label: newLabel } : item)
    }));
  };
  
  const renderList = (type, title, description, Icon) => (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
             <Icon className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {settings[type].map((item, index) => (
          <div key={item.id} className="flex items-center gap-2">
            <Input
              value={item.label}
              onChange={(e) => handleItemChange(type, item.id, e.target.value)}
              placeholder="Enter service type label"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveItem(type, item.id)}
              className="text-slate-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" className="w-full mt-2 gap-2 border-dashed" onClick={() => handleAddItem(type)}>
          <Plus className="w-4 h-4" /> Add Type
        </Button>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Service</h2>
          <p className="text-slate-600">Customize service outcome types and description helper options.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Description Buttons Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Service Description Helper
          </CardTitle>
          <CardDescription>
            Quick-select buttons to speed up data entry when logging service attempts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-medium">Show Description Buttons</div>
              <p className="text-sm text-slate-500">Display quick-select buttons for age, height, weight, hair color, and gender when logging served person details.</p>
            </div>
            <Switch 
              checked={settings.show_description_buttons} 
              onCheckedChange={(checked) => setSettings(prev => ({...prev, show_description_buttons: checked}))} 
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {renderList('successful', 'Successful Service', 'Types that appear after marking an attempt as "Served".', CheckCircle)}
        {renderList('unsuccessful', 'Unsuccessful Service', 'Types for attempts that are "Not Served".', AlertCircle)}
      </div>
    </div>
  );
}
