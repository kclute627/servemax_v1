import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Star,
  Users,
  Check,
  Eye
} from "lucide-react";
import { entities } from "@/firebase/database";
import { AdminStatsManager } from "@/firebase/adminStats";
import { useToast } from "@/components/ui/use-toast";

export default function PricingConfigPanel() {
  const [standardPlans, setStandardPlans] = useState([]);
  const [customPlans, setCustomPlans] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showCustomPlanDialog, setShowCustomPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const { toast } = useToast();

  const [planForm, setPlanForm] = useState({
    name: "",
    job_limit: "",
    monthly_price: "",
    features: ["Unlimited clients", "Document generation", "Email support"]
  });

  const [customPlanForm, setCustomPlanForm] = useState({
    job_limit: "",
    monthly_price: "",
    company_ids: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [plans, allCompanies] = await Promise.all([
        entities.PricingPlan.list(),
        AdminStatsManager.getAllCompanies()
      ]);

      const standard = plans.filter(p => !p.is_custom);
      const custom = plans.filter(p => p.is_custom);

      setStandardPlans(standard);
      setCustomPlans(custom);
      setCompanies(allCompanies);
    } catch (error) {
      console.error("Error loading pricing data:", error);
      toast({
        title: "Error",
        description: "Failed to load pricing plans",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStandardPlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: "",
      job_limit: "",
      monthly_price: "",
      features: ["Unlimited clients", "Document generation", "Email support"]
    });
    setShowPlanDialog(true);
  };

  const handleEditStandardPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      job_limit: plan.job_limit.toString(),
      monthly_price: plan.monthly_price.toString(),
      features: plan.features || []
    });
    setShowPlanDialog(true);
  };

  const handleSaveStandardPlan = async () => {
    try {
      const planData = {
        name: planForm.name,
        job_limit: parseInt(planForm.job_limit),
        monthly_price: parseFloat(planForm.monthly_price),
        features: planForm.features,
        is_custom: false,
        is_visible_on_home: true,
        assigned_companies: []
      };

      if (editingPlan) {
        await entities.PricingPlan.update(editingPlan.id, planData);
        toast({ title: "Success", description: "Pricing plan updated" });
      } else {
        await entities.PricingPlan.create(planData);
        toast({ title: "Success", description: "Pricing plan created" });
      }

      setShowPlanDialog(false);
      loadData();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({
        title: "Error",
        description: "Failed to save pricing plan",
        variant: "destructive"
      });
    }
  };

  const handleDeleteStandardPlan = async (planId) => {
    if (!confirm("Are you sure you want to delete this pricing plan?")) return;

    try {
      await entities.PricingPlan.delete(planId);
      toast({ title: "Success", description: "Pricing plan deleted" });
      loadData();
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast({
        title: "Error",
        description: "Failed to delete pricing plan",
        variant: "destructive"
      });
    }
  };

  const handleCreateCustomPlan = () => {
    setCustomPlanForm({
      job_limit: "",
      monthly_price: "",
      company_ids: []
    });
    setSelectedCompanies([]);
    setShowCustomPlanDialog(true);
  };

  const handleSaveCustomPlan = async () => {
    try {
      const planData = {
        name: `Custom Plan (${customPlanForm.job_limit} jobs)`,
        job_limit: parseInt(customPlanForm.job_limit),
        monthly_price: parseFloat(customPlanForm.monthly_price),
        features: ["Custom pricing", "All standard features"],
        is_custom: true,
        is_visible_on_home: false,
        assigned_companies: selectedCompanies
      };

      await entities.PricingPlan.create(planData);
      toast({ title: "Success", description: "Custom pricing created" });
      setShowCustomPlanDialog(false);
      loadData();
    } catch (error) {
      console.error("Error saving custom plan:", error);
      toast({
        title: "Error",
        description: "Failed to save custom plan",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCustomPlan = async (planId) => {
    if (!confirm("Are you sure you want to delete this custom pricing?")) return;

    try {
      await entities.PricingPlan.delete(planId);
      toast({ title: "Success", description: "Custom pricing deleted" });
      loadData();
    } catch (error) {
      console.error("Error deleting custom plan:", error);
      toast({
        title: "Error",
        description: "Failed to delete custom plan",
        variant: "destructive"
      });
    }
  };

  const toggleCompanySelection = (companyId) => {
    setSelectedCompanies(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const getCompanyName = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    return company?.name || "Unknown Company";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading pricing configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Standard Plans Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Standard Pricing Plans</h2>
            <p className="text-slate-600">Plans visible on the home page for all users</p>
          </div>
          <Button onClick={handleCreateStandardPlan} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Plan
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {standardPlans.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <DollarSign className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No standard pricing plans yet</p>
                <Button
                  variant="outline"
                  onClick={handleCreateStandardPlan}
                  className="mt-4 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create First Plan
                </Button>
              </CardContent>
            </Card>
          ) : (
            standardPlans.map((plan) => (
              <Card key={plan.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{plan.name}</CardTitle>
                      <div className="mt-2">
                        <span className="text-3xl font-bold">${plan.monthly_price}</span>
                        <span className="text-slate-500">/month</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <Eye className="w-3 h-3" />
                      Visible
                    </Badge>
                  </div>
                  <CardDescription className="text-lg font-semibold mt-2">
                    {plan.job_limit} jobs per month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {plan.features?.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditStandardPlan(plan)}
                      className="flex-1 gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteStandardPlan(plan.id)}
                      className="gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Custom Plans Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Custom Pricing</h2>
            <p className="text-slate-600">Special rates for specific companies (not shown on home page)</p>
          </div>
          <Button onClick={handleCreateCustomPlan} variant="outline" className="gap-2">
            <Star className="w-4 h-4" />
            Add Custom Pricing
          </Button>
        </div>

        <div className="space-y-4">
          {customPlans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Star className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No custom pricing arrangements yet</p>
                <Button
                  variant="outline"
                  onClick={handleCreateCustomPlan}
                  className="mt-4 gap-2"
                >
                  <Star className="w-4 h-4" />
                  Create Custom Pricing
                </Button>
              </CardContent>
            </Card>
          ) : (
            customPlans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500" />
                        {plan.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <span className="text-2xl font-bold text-slate-900">
                          ${plan.monthly_price}
                        </span>
                        <span className="text-slate-500">/month • </span>
                        <span className="font-semibold">{plan.job_limit} jobs</span>
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCustomPlan(plan.id)}
                      className="gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">
                        Assigned Companies ({plan.assigned_companies?.length || 0}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {plan.assigned_companies?.map((companyId) => (
                          <Badge key={companyId} variant="outline">
                            {getCompanyName(companyId)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Standard Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Edit Pricing Plan" : "Create Pricing Plan"}
            </DialogTitle>
            <DialogDescription>
              Configure a standard pricing plan that will be visible on the home page
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                placeholder="e.g., Professional"
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="job_limit">Jobs Per Month</Label>
              <Input
                id="job_limit"
                type="number"
                placeholder="e.g., 100"
                value={planForm.job_limit}
                onChange={(e) => setPlanForm({ ...planForm, job_limit: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="price">Monthly Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="e.g., 39.99"
                value={planForm.monthly_price}
                onChange={(e) => setPlanForm({ ...planForm, monthly_price: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStandardPlan}>
              {editingPlan ? "Update" : "Create"} Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Plan Dialog */}
      <Dialog open={showCustomPlanDialog} onOpenChange={setShowCustomPlanDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Custom Pricing</DialogTitle>
            <DialogDescription>
              Set a special rate for specific companies (not displayed on home page)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="custom_job_limit">Jobs Per Month</Label>
                <Input
                  id="custom_job_limit"
                  type="number"
                  placeholder="e.g., 100"
                  value={customPlanForm.job_limit}
                  onChange={(e) =>
                    setCustomPlanForm({ ...customPlanForm, job_limit: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="custom_price">Monthly Price ($)</Label>
                <Input
                  id="custom_price"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 19.99"
                  value={customPlanForm.monthly_price}
                  onChange={(e) =>
                    setCustomPlanForm({ ...customPlanForm, monthly_price: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Select Companies</Label>
              <Card className="mt-2 max-h-64 overflow-y-auto">
                <CardContent className="p-4 space-y-2">
                  {companies.map((company) => (
                    <div
                      key={company.id}
                      onClick={() => toggleCompanySelection(company.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedCompanies.includes(company.id)
                          ? "bg-blue-50 border-2 border-blue-300"
                          : "bg-slate-50 border-2 border-transparent hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedCompanies.includes(company.id)
                            ? "bg-blue-600 border-blue-600"
                            : "border-slate-300"
                        }`}
                      >
                        {selectedCompanies.includes(company.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{company.name}</p>
                        <p className="text-xs text-slate-500">{company.email}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <p className="text-xs text-slate-500 mt-2">
                {selectedCompanies.length} companies selected
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomPlanDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomPlan} disabled={selectedCompanies.length === 0}>
              Create Custom Pricing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
