import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TemplateCodeEditor from '@/components/affidavit/TemplateCodeEditor';
import { getStarterTemplatesList, getStarterTemplate } from '@/utils/starterTemplates';
import { db } from '@/firebase/config';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useGlobalData } from '@/components/GlobalDataContext';

export default function TemplateEditor() {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const [searchParams] = useSearchParams();
  const { companyData } = useGlobalData();
  const isEditMode = !!templateId;

  const [formData, setFormData] = useState({
    name: '',
    state_code: '',
    county: '',
    court_type: '',
    description: '',
    template_mode: 'simple',
    html_content: '',
    body: '',
    footer_text: '',
    service_status: 'both',
    is_system_template: false,
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load template data in edit mode
  useEffect(() => {
    if (isEditMode && templateId) {
      loadTemplate();
    }
  }, [isEditMode, templateId]);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const templateRef = doc(db, 'affidavit_templates', templateId);
      const templateSnap = await getDoc(templateRef);

      if (templateSnap.exists()) {
        setFormData({
          ...templateSnap.data(),
          is_system_template: templateSnap.data().is_system_template || false,
          is_active: templateSnap.data().is_active !== false,
        });
      } else {
        alert('Template not found');
        navigate('/settings');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (formData.template_mode === 'html' && !formData.html_content?.trim()) {
      alert('Please enter HTML content for the template');
      return;
    }

    if (formData.template_mode === 'simple' && !formData.body?.trim()) {
      alert('Please enter body text for the template');
      return;
    }

    setSaving(true);
    try {
      const templateData = {
        ...formData,
        company_id: companyData?.id || null,
        updated_at: serverTimestamp(),
      };

      if (isEditMode) {
        // Update existing template
        const templateRef = doc(db, 'affidavit_templates', templateId);
        await updateDoc(templateRef, templateData);
      } else {
        // Create new template
        const templateRef = doc(db, 'affidavit_templates');
        await setDoc(templateRef, {
          ...templateData,
          created_at: serverTimestamp(),
        });
      }

      navigate('/settings');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? Unsaved changes will be lost.')) {
      navigate('/settings');
    }
  };

  const handleLoadStarterTemplate = (templateId) => {
    console.log('Loading starter template:', templateId);
    const template = getStarterTemplate(templateId);
    console.log('Template loaded:', template);

    if (template && template.html) {
      setFormData({
        ...formData,
        html_content: template.html,
        template_mode: 'html',
      });
    } else {
      console.error('Template not found or missing HTML:', templateId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/settings')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Button>
          <div className="h-6 w-px bg-slate-300"></div>
          <h1 className="text-xl font-semibold text-slate-900">
            {isEditMode ? 'Edit Template' : 'Create New Template'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Metadata (25%) */}
        <div className="w-1/4 bg-white border-r overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Template Name */}
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Illinois Standard Affidavit"
                className="mt-1"
              />
            </div>

            {/* State Code */}
            <div>
              <Label htmlFor="state_code">State Code</Label>
              <Input
                id="state_code"
                value={formData.state_code}
                onChange={(e) => setFormData({ ...formData, state_code: e.target.value.toUpperCase() })}
                placeholder="e.g., IL"
                maxLength={2}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Two-letter state code (optional)</p>
            </div>

            {/* County */}
            <div>
              <Label htmlFor="county">County</Label>
              <Input
                id="county"
                value={formData.county}
                onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                placeholder="e.g., Cook County"
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Leave blank for all counties</p>
            </div>

            {/* Court Type */}
            <div>
              <Label htmlFor="court_type">Court Type</Label>
              <Input
                id="court_type"
                value={formData.court_type}
                onChange={(e) => setFormData({ ...formData, court_type: e.target.value })}
                placeholder="e.g., Circuit Court"
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Leave blank for all court types</p>
            </div>

            {/* Service Status */}
            <div>
              <Label>Service Status</Label>
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="status-both"
                    value="both"
                    checked={formData.service_status === 'both'}
                    onChange={(e) => setFormData({ ...formData, service_status: e.target.value })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="status-both" className="font-normal cursor-pointer">
                    Both/Any (works for served & not served)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="status-served"
                    value="served"
                    checked={formData.service_status === 'served'}
                    onChange={(e) => setFormData({ ...formData, service_status: e.target.value })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="status-served" className="font-normal cursor-pointer">
                    Served Only (successful service)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="status-not-served"
                    value="not_served"
                    checked={formData.service_status === 'not_served'}
                    onChange={(e) => setFormData({ ...formData, service_status: e.target.value })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="status-not-served" className="font-normal cursor-pointer">
                    Not Served Only (due diligence)
                  </Label>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Some courts require separate affidavits for served vs non-served
              </p>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this template..."
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Template Mode */}
            <div>
              <Label>Template Mode *</Label>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="mode-simple"
                    value="simple"
                    checked={formData.template_mode === 'simple'}
                    onChange={(e) => setFormData({ ...formData, template_mode: e.target.value })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="mode-simple" className="font-normal cursor-pointer">
                    Simple Text
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="mode-html"
                    value="html"
                    checked={formData.template_mode === 'html'}
                    onChange={(e) => setFormData({ ...formData, template_mode: e.target.value })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="mode-html" className="font-normal cursor-pointer">
                    HTML/CSS
                  </Label>
                </div>
              </div>
            </div>

            {/* Starter Template Loader (only for HTML mode) */}
            {formData.template_mode === 'html' && (
              <div>
                <Label htmlFor="starter-template">Load Starter Template</Label>
                <Select
                  id="starter-template"
                  className="mt-1"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleLoadStarterTemplate(e.target.value);
                      e.target.value = ''; // Reset to placeholder after selection
                    }
                  }}
                >
                  <SelectItem value="">Choose a starter template...</SelectItem>
                  {getStarterTemplatesList().map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  {getStarterTemplatesList().length} templates available - This will replace current content
                </p>
              </div>
            )}

            {/* Simple Mode Fields */}
            {formData.template_mode === 'simple' && (
              <>
                <div>
                  <Label htmlFor="body">Body Text *</Label>
                  <Textarea
                    id="body"
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="Main body text with placeholders like {{server_name}}..."
                    className="mt-1 font-mono text-sm"
                    rows={8}
                  />
                </div>

                <div>
                  <Label htmlFor="footer_text">Footer Text</Label>
                  <Textarea
                    id="footer_text"
                    value={formData.footer_text}
                    onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                    placeholder="Footer text (optional)..."
                    className="mt-1 font-mono text-sm"
                    rows={4}
                  />
                </div>
              </>
            )}

            {/* Checkboxes */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active" className="font-normal cursor-pointer">
                  Active (available for use)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_system_template"
                  checked={formData.is_system_template}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_system_template: checked })}
                />
                <Label htmlFor="is_system_template" className="font-normal cursor-pointer">
                  System Template (available to all companies)
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Main Area - Editor (75%) */}
        <div className="flex-1 bg-slate-50 overflow-hidden">
          {formData.template_mode === 'html' ? (
            <TemplateCodeEditor
              value={formData.html_content}
              onChange={(value) => setFormData({ ...formData, html_content: value })}
              className="h-full"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">Simple Text Mode</p>
                <p className="text-sm">Edit body and footer text in the sidebar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
