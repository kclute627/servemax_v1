import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Edit, Trash2, Copy, Building2 } from "lucide-react";
import { entities } from "@/firebase/database";
import { useToast } from "@/components/ui/use-toast";
import NewEmailTemplateDialog from "./NewEmailTemplateDialog";
import EditEmailTemplateDialog from "./EditEmailTemplateDialog";

const templateTypeLabels = {
  attempt: "Service Attempt",
  note: "Note",
  affidavit: "Affidavit",
  invoice: "Invoice",
  case_summary: "Case Summary",
};

const templateTypeColors = {
  attempt: "bg-blue-100 text-blue-800",
  note: "bg-green-100 text-green-800",
  affidavit: "bg-purple-100 text-purple-800",
  invoice: "bg-orange-100 text-orange-800",
  case_summary: "bg-indigo-100 text-indigo-800",
};

export default function EmailTemplatesList() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const emailTemplates = await entities.EmailTemplate.list();
      // Sort: default templates first, then by type, then by name
      const sorted = (emailTemplates || []).sort((a, b) => {
        if (a.is_default !== b.is_default) {
          return b.is_default ? 1 : -1; // default templates first
        }
        if (a.template_type !== b.template_type) {
          return a.template_type.localeCompare(b.template_type);
        }
        return a.name.localeCompare(b.name);
      });
      setTemplates(sorted);
    } catch (error) {
      console.error("Error loading email templates:", error);
      toast({
        title: "Error",
        description: "Failed to load email templates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setShowNewDialog(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowEditDialog(true);
  };

  const handleDuplicate = async (template) => {
    try {
      const newTemplate = {
        name: `${template.name} (Copy)`,
        description: template.description,
        template_type: template.template_type,
        subject: template.subject,
        body: template.body,
        is_default: false, // copies are never default
        company_id: template.company_id,
      };
      await entities.EmailTemplate.create(newTemplate);
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

  const handleDelete = async (template) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    try {
      await entities.EmailTemplate.delete(template.id);
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
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

  const handleDialogClose = () => {
    setShowNewDialog(false);
    setShowEditDialog(false);
    setEditingTemplate(null);
    loadTemplates();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Email Templates</h2>
          <p className="text-slate-600 mt-1">
            Create and manage email templates for SendGrid integration
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Templates support SendGrid variables like {`{{job_number}}`}, {`{{client_name}}`}, {`{{attempt_date}}`}, etc.
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      {/* Templates List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading templates...</div>
      ) : templates.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Mail className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Email Templates Yet</h3>
            <p className="text-slate-600 mb-4">
              Create your first email template to get started with SendGrid integration
            </p>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge className={templateTypeColors[template.template_type] || "bg-slate-100 text-slate-800"}>
                    {templateTypeLabels[template.template_type] || template.template_type}
                  </Badge>
                  <div className="flex gap-1">
                    {template.is_default && (
                      <Badge variant="outline" className="text-xs">
                        Default
                      </Badge>
                    )}
                    {template.company_id && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Building2 className="w-3 h-3" />
                        Custom
                      </Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {template.description && (
                  <p className="text-sm text-slate-600 mt-2">{template.description}</p>
                )}
                <p className="text-xs text-slate-500 mt-2 font-mono truncate">
                  Subject: {template.subject}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => handleDuplicate(template)}
                  >
                    <Copy className="w-3 h-3" />
                    Duplicate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(template)}
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      {showNewDialog && (
        <NewEmailTemplateDialog
          open={showNewDialog}
          onOpenChange={handleDialogClose}
        />
      )}
      {showEditDialog && editingTemplate && (
        <EditEmailTemplateDialog
          open={showEditDialog}
          onOpenChange={handleDialogClose}
          template={editingTemplate}
        />
      )}
    </div>
  );
}
