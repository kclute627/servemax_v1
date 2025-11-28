import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SystemAffidavitTemplate } from "@/api/entities";
import { useAuth } from "@/components/auth/AuthProvider";
import { useGlobalData } from "@/components/GlobalDataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, Copy, FileText, Globe, Building, HelpCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { isSuperAdmin } from "@/utils/permissions";
import { getAvailablePlaceholders } from "@/utils/templateEngine";
import { STARTER_TEMPLATES } from "@/utils/starterTemplates";
import { db } from "@/firebase/config";
import { setDoc, doc, getDoc } from "firebase/firestore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AffidavitTemplatesPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyData } = useGlobalData();
  const { toast } = useToast();

  const [allTemplates, setAllTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [viewTemplate, setViewTemplate] = useState(null);

  // Check if user is super admin
  const isUserSuperAdmin = isSuperAdmin(user);

  useEffect(() => {
    loadTemplates();
  }, [companyData]);

  const seedSystemTemplates = async () => {
    console.log("Seeding system templates from starter templates...");
    try {
      const templateKeys = Object.keys(STARTER_TEMPLATES);
      let createdCount = 0;
      let skippedCount = 0;

      for (const key of templateKeys) {
        // Check if template already exists
        const templateRef = doc(db, 'system_affidavit_templates', key);
        const existingTemplate = await getDoc(templateRef);

        const templateData = {
          name: STARTER_TEMPLATES[key].name,
          description: STARTER_TEMPLATES[key].description,
          service_status: STARTER_TEMPLATES[key].service_status,
          template_mode: 'html',
          html_content: STARTER_TEMPLATES[key].html,
          jurisdiction: key === 'illinois' ? 'Illinois' :
                        key === 'california' ? 'California' :
                        key === 'ao440_federal' ? 'Federal' :
                        'General',
          who_can_see: 'everyone', // System templates visible to all
          is_active: STARTER_TEMPLATES[key].is_active !== undefined ? STARTER_TEMPLATES[key].is_active : true,
          updated_at: new Date().toISOString()
        };

        if (existingTemplate.exists()) {
          // Update existing template (preserves created_at)
          await setDoc(templateRef, templateData, { merge: true });
          console.log(`Updated system template: ${templateData.name} with ID: ${key}`);
          skippedCount++;
        } else {
          // Create new template
          templateData.created_at = new Date().toISOString();
          await setDoc(templateRef, templateData);
          console.log(`Created system template: ${templateData.name} with ID: ${key}`);
          createdCount++;
        }
      }

      toast({
        title: "System Templates Seeded",
        description: `Created ${createdCount} new template(s), updated ${skippedCount} existing template(s)`,
      });

      return true;
    } catch (error) {
      console.error("Error seeding system templates:", error);
      toast({
        title: "Error",
        description: "Failed to seed system templates",
        variant: "destructive",
      });
      return false;
    }
  };

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      // Load all templates from system_affidavit_templates
      // Firestore rules will filter based on who_can_see
      const templates = await SystemAffidavitTemplate.list();

      console.log('=== LOAD TEMPLATES DEBUG ===');
      console.log('Templates count:', templates?.length || 0);
      console.log('Templates:', templates?.map(t => ({ id: t.id, name: t.name, who_can_see: t.who_can_see })) || []);
      console.log('========================');

      // Auto-seed system templates if none exist and user is super admin
      if ((!templates || templates.length === 0) && isUserSuperAdmin) {
        console.log("No templates found, seeding...");
        const seeded = await seedSystemTemplates();
        if (seeded) {
          // Reload templates after seeding
          const reloadedTemplates = await SystemAffidavitTemplate.list();
          console.log('Reloaded templates after seeding:', reloadedTemplates?.map(t => ({ id: t.id, name: t.name, who_can_see: t.who_can_see })) || []);
          setAllTemplates(reloadedTemplates || []);
        }
      } else {
        // Client-side filter for extra safety (though Firestore rules handle this)
        const filteredTemplates = templates?.filter(template => {
          if (template.who_can_see === 'everyone') return true;
          if (Array.isArray(template.who_can_see) && companyData?.id) {
            return template.who_can_see.includes(companyData.id);
          }
          return false;
        }) || [];

        setAllTemplates(filteredTemplates);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({
        title: "Error",
        description: "Failed to load affidavit templates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    navigate('/settings/templates/new');
  };

  const handleEdit = (template) => {
    console.log('=== EDIT TEMPLATE DEBUG ===');
    console.log('Template object:', template);
    console.log('Template ID:', template.id);
    console.log('Navigate URL:', `/settings/templates/edit/${template.id}`);
    console.log('========================');
    navigate(`/settings/templates/edit/${template.id}`);
  };

  const handleView = (template) => {
    console.log('Viewing template:', template);
    setViewTemplate(template);
  };

  const handleDuplicate = async (template) => {
    try {
      const templateData = {
        name: `${template.name} (Copy)`,
        jurisdiction: template.jurisdiction || '',
        county: template.county || '',
        court_type: template.court_type || '',
        body: template.body || '',
        footer_text: template.footer_text || '',
        description: template.description || '',
        template_mode: template.template_mode || 'simple',
        html_content: template.html_content || '',
        service_status: template.service_status || 'both',
        include_notary_default: template.include_notary_default || false,
        include_company_info_default: template.include_company_info_default || false,
        who_can_see: companyData?.id ? [companyData.id] : [], // Company-specific duplicate
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await SystemAffidavitTemplate.create(templateData);

      toast({
        title: "Success",
        description: "Template duplicated successfully",
      });

      loadTemplates();
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate template",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    try {
      await SystemAffidavitTemplate.delete(templateToDelete.id);

      toast({
        title: "Success",
        description: "Template deleted successfully",
      });

      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
      loadTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (template) => {
    // Check if user has permission to delete
    const canDelete = isUserSuperAdmin ||
                     (Array.isArray(template.who_can_see) &&
                      template.who_can_see.includes(companyData?.id));

    if (!canDelete) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete this template",
        variant: "destructive",
      });
      return;
    }

    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const TemplateCard = ({ template }) => {
    const isSystemTemplate = template.who_can_see === 'everyone';
    const canEdit = isSystemTemplate ? isUserSuperAdmin : true;
    const canDelete = isSystemTemplate ? isUserSuperAdmin :
                     (Array.isArray(template.who_can_see) &&
                      template.who_can_see.includes(companyData?.id));

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <Badge variant={isSystemTemplate ? "default" : "secondary"}>
                  {isSystemTemplate ? (
                    <><Globe className="w-3 h-3 mr-1" />System</>
                  ) : (
                    <><Building className="w-3 h-3 mr-1" />Custom</>
                  )}
                </Badge>
              </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Badge variant="outline" className="font-mono">
                {template.jurisdiction}
              </Badge>
            </div>
          </div>
        </div>
        {template.description && (
          <p className="text-sm text-slate-600 mt-2">{template.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
          {template.include_notary_default && (
            <Badge variant="outline" className="text-xs">Notary Block</Badge>
          )}
          {template.include_company_info_default && (
            <Badge variant="outline" className="text-xs">Company Info</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleView(template)}
            className="gap-1"
          >
            <FileText className="w-3 h-3" />
            View
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(template)}
              className="gap-1"
            >
              <Edit className="w-3 h-3" />
              Edit
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDuplicate(template)}
            className="gap-1"
          >
            <Copy className="w-3 h-3" />
            Duplicate
          </Button>
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(template)}
              className="gap-1 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
    );
  };

  // Separate templates into system and custom for display
  const systemTemplates = allTemplates.filter(t => t.who_can_see === 'everyone');
  const customTemplates = allTemplates.filter(t => t.who_can_see !== 'everyone');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Affidavit Templates</h2>
          <p className="text-slate-600 mt-1">
            Manage system-wide and custom templates for generating affidavits
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isUserSuperAdmin && (
            <Button
              onClick={async () => {
                const seeded = await seedSystemTemplates();
                if (seeded) {
                  loadTemplates();
                }
              }}
              variant="outline"
              className="gap-2"
            >
              Seed Templates
            </Button>
          )}
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            New Template
          </Button>
        </div>
      </div>

      {/* Available Placeholders Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Available Template Placeholders
          </CardTitle>
          <p className="text-xs text-slate-600 mt-1">
            Use these placeholders in your template body and footer. They will be replaced with actual data when generating affidavits.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {getAvailablePlaceholders().map(({ placeholder, description }) => (
              <div key={placeholder} className="flex items-start gap-2 text-xs">
                <code className="bg-white px-2 py-1 rounded font-mono text-blue-700 flex-shrink-0">
                  {placeholder}
                </code>
                <span className="text-slate-600 pt-1">{description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading templates...</div>
      ) : allTemplates.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Templates Yet</h3>
            <p className="text-slate-600 mb-4">
              {isUserSuperAdmin
                ? "Click 'Seed Templates' to create system templates, or create custom templates"
                : "Create custom templates or duplicate system templates to get started"}
            </p>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {systemTemplates.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                System Templates (Available to All)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {systemTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </div>
          )}

          {customTemplates.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                <Building className="w-5 h-5" />
                My Company Templates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Template Dialog */}
      <AlertDialog open={!!viewTemplate} onOpenChange={() => setViewTemplate(null)}>
        <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{viewTemplate?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              {viewTemplate?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Jurisdiction</Label>
              <p className="text-sm text-slate-600">{viewTemplate?.jurisdiction || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Template Mode</Label>
              <p className="text-sm text-slate-600">{viewTemplate?.template_mode || 'html'}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold">HTML Content</Label>
              <Textarea
                value={viewTemplate?.html_content || ''}
                readOnly
                rows={20}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
