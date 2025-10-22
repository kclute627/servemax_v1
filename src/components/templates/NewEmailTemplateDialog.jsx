import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem } from "@/components/ui/select";
import { Loader2, Info } from "lucide-react";
import { entities } from "@/firebase/database";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

const templateTypeOptions = [
  { value: "attempt", label: "Service Attempt" },
  { value: "note", label: "Note" },
  { value: "affidavit", label: "Affidavit" },
  { value: "invoice", label: "Invoice" },
  { value: "case_summary", label: "Case Summary" },
];

const variablesByType = {
  attempt: [
    "{{job_number}}",
    "{{client_name}}",
    "{{defendant_name}}",
    "{{attempt_date}}",
    "{{attempt_time}}",
    "{{attempt_status}}",
    "{{address_of_attempt}}",
    "{{server_name}}",
    "{{notes}}",
    "{{gps_coordinates}}",
  ],
  note: [
    "{{job_number}}",
    "{{client_name}}",
    "{{defendant_name}}",
    "{{note_text}}",
    "{{note_date}}",
    "{{author_name}}",
  ],
  affidavit: [
    "{{job_number}}",
    "{{client_name}}",
    "{{defendant_name}}",
    "{{service_date}}",
    "{{server_name}}",
    "{{affidavit_url}}",
  ],
  invoice: [
    "{{invoice_number}}",
    "{{invoice_date}}",
    "{{client_name}}",
    "{{total_amount}}",
    "{{due_date}}",
    "{{invoice_url}}",
    "{{line_items}}",
  ],
  case_summary: [
    "{{job_number}}",
    "{{client_name}}",
    "{{defendant_name}}",
    "{{case_number}}",
    "{{status}}",
    "{{attempts_count}}",
    "{{notes_count}}",
    "{{service_date}}",
    "{{all_attempts}}",
    "{{all_notes}}",
  ],
};

export default function NewEmailTemplateDialog({ open, onOpenChange }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateType, setTemplateType] = useState("attempt");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadCompanies();
      // Reset form
      setName("");
      setDescription("");
      setTemplateType("attempt");
      setSubject("");
      setBody("");
      setIsDefault(false);
      setSelectedCompanyId("");
    }
  }, [open]);

  const loadCompanies = async () => {
    try {
      const companiesList = await entities.Company.list();
      setCompanies(companiesList || []);
    } catch (error) {
      console.error("Error loading companies:", error);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim()) {
      toast({
        title: "Validation Error",
        description: "Email subject is required",
        variant: "destructive",
      });
      return;
    }

    if (!body.trim()) {
      toast({
        title: "Validation Error",
        description: "Email body is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const templateData = {
        name: name.trim(),
        description: description.trim(),
        template_type: templateType,
        subject: subject.trim(),
        body: body.trim(),
        is_default: isDefault,
        company_id: selectedCompanyId || null,
      };

      await entities.EmailTemplate.create(templateData);

      toast({
        title: "Success",
        description: "Email template created successfully",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error creating email template:", error);
      toast({
        title: "Error",
        description: "Failed to create email template: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertVariable = (variable) => {
    setBody(body + variable);
  };

  const availableVariables = variablesByType[templateType] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Email Template</DialogTitle>
          <DialogDescription>
            Create a new email template for SendGrid integration. Templates can be used when sending notifications about attempts, notes, affidavits, invoices, or case summaries.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Default Attempt Notification"
              />
            </div>

            <div>
              <Label htmlFor="type">Template Type *</Label>
              <Select id="type" value={templateType} onValueChange={setTemplateType}>
                {templateTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of when to use this template"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-default"
                checked={isDefault}
                onCheckedChange={setIsDefault}
              />
              <Label htmlFor="is-default" className="text-sm font-normal cursor-pointer">
                Set as default template for this type
              </Label>
            </div>

            <div>
              <Label htmlFor="company">Company (Optional - for custom templates)</Label>
              <Select
                id="company"
                value={selectedCompanyId}
                onValueChange={setSelectedCompanyId}
                disabled={isDefault}
              >
                <option value="">All Companies (General Template)</option>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.company_name}
                  </SelectItem>
                ))}
              </Select>
              {isDefault && (
                <p className="text-xs text-slate-500 mt-1">
                  Default templates cannot be company-specific
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="subject">Email Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Service Attempt Report - Job {{job_number}}"
            />
          </div>

          <div>
            <Label htmlFor="body">Email Body *</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Enter the email body with SendGrid variables..."
              className="font-mono text-sm"
            />
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Available Variables for {templateTypeOptions.find(t => t.value === templateType)?.label}:</p>
                <div className="flex flex-wrap gap-2">
                  {availableVariables.map((variable) => (
                    <Button
                      key={variable}
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable(variable)}
                      className="text-xs font-mono"
                    >
                      {variable}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Click a variable to insert it into the email body. These will be replaced with actual data when sending emails.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
