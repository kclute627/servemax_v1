import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AffidavitTemplate, SystemAffidavitTemplate } from "@/api/entities";
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

  const [systemTemplates, setSystemTemplates] = useState([]);
  const [companyTemplates, setCompanyTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewSystemTemplates, setViewSystemTemplates] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  // Check if user is super admin
  const isUserSuperAdmin = isSuperAdmin(user);

  useEffect(() => {
    loadTemplates();
  }, [companyData, viewSystemTemplates]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      // Load system templates
      const systemTmpl = await SystemAffidavitTemplate.list();
      setSystemTemplates(systemTmpl || []);

      // Load company-specific templates if not viewing system templates
      if (!viewSystemTemplates && companyData?.id) {
        const companyTmpl = await AffidavitTemplate.filter({ company_id: companyData.id });
        setCompanyTemplates(companyTmpl || []);
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
    navigate(`/settings/templates/edit/${template.id}`);
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
        include_notary_default: template.include_notary_default || false,
        include_company_info_default: template.include_company_info_default || false,
        company_id: companyData?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await AffidavitTemplate.create(templateData);

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
      const entity = templateToDelete.isSystem ? SystemAffidavitTemplate : AffidavitTemplate;
      await entity.delete(templateToDelete.id);

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

  const handleDelete = (template, isSystem = false) => {
    setTemplateToDelete({ ...template, isSystem });
    setDeleteDialogOpen(true);
  };

  const TemplateCard = ({ template, isSystem = false }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <Badge variant={isSystem ? "default" : "secondary"}>
                {isSystem ? (
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
          {!isSystem && (
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
          {!isSystem && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(template, false)}
              className="gap-1 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </Button>
          )}
          {isSystem && isUserSuperAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(template)}
                className="gap-1"
              >
                <Edit className="w-3 h-3" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(template, true)}
                className="gap-1 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const templatesToDisplay = viewSystemTemplates ? systemTemplates : companyTemplates;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Affidavit Templates</h2>
          <p className="text-slate-600 mt-1">
            {viewSystemTemplates
              ? "Manage system-wide default templates available to all companies"
              : "Manage custom templates for your company"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isUserSuperAdmin && (
            <div className="flex items-center gap-2">
              <Switch
                id="system-templates"
                checked={viewSystemTemplates}
                onCheckedChange={setViewSystemTemplates}
              />
              <Label htmlFor="system-templates" className="cursor-pointer">
                System Templates
              </Label>
            </div>
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
      ) : templatesToDisplay.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Templates Yet</h3>
            <p className="text-slate-600 mb-4">
              {viewSystemTemplates
                ? "Create system templates that will be available to all companies"
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
          {!viewSystemTemplates && systemTemplates.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                System Templates (Available to All)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {systemTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} isSystem={true} />
                ))}
              </div>
            </div>
          )}

          {!viewSystemTemplates && companyTemplates.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                <Building className="w-5 h-5" />
                My Company Templates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companyTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} isSystem={false} />
                ))}
              </div>
            </div>
          )}

          {viewSystemTemplates && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} isSystem={true} />
              ))}
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
    </div>
  );
}
