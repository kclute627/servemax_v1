import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, File, Edit, Trash2, Copy } from "lucide-react";
import { entities } from "@/firebase/database";
import { useToast } from "@/components/ui/use-toast";

export default function BusinessFormsTemplatesList() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const businessForms = await entities.BusinessFormTemplate.list();
      setTemplates(businessForms || []);
    } catch (error) {
      console.error("Error loading business form templates:", error);
      toast({
        title: "Error",
        description: "Failed to load business form templates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    toast({
      title: "Coming Soon",
      description: "Business form template editor is under development",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Business Form Templates</h2>
          <p className="text-slate-600 mt-1">
            Create and manage generic business form templates
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
            <File className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Business Form Templates Yet</h3>
            <p className="text-slate-600 mb-4">
              Create your first business form template to get started
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
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.category && (
                      <Badge variant="outline" className="mt-2">
                        {template.category}
                      </Badge>
                    )}
                    {template.description && (
                      <p className="text-sm text-slate-600 mt-2">{template.description}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Edit className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Copy className="w-3 h-3" />
                    Duplicate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-red-600 hover:text-red-700"
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
    </div>
  );
}
