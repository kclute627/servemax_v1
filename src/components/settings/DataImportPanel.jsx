import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import {
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Database,
  FileText,
  Building2,
  Scale,
  Users,
  Clock,
  RefreshCw,
  Eye,
  EyeOff,
  Info
} from "lucide-react";
import { FirebaseFunctions } from "@/firebase/functions";
import { format } from "date-fns";

export default function DataImportPanel() {
  const { toast } = useToast();

  // API Key state
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [validatingKey, setValidatingKey] = useState(false);
  const [keyValidation, setKeyValidation] = useState(null); // { valid, account, error }

  // Import state
  const [startingImport, setStartingImport] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Load existing import status on mount
  useEffect(() => {
    loadImportStatus();
  }, []);

  // Poll for status updates while import is in progress
  useEffect(() => {
    if (importStatus?.status === "in_progress" || importStatus?.status === "pending") {
      const interval = setInterval(() => {
        loadImportStatus(false);
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [importStatus?.status]);

  const loadImportStatus = async (showLoading = true) => {
    if (showLoading) {
      setLoadingStatus(true);
    }
    try {
      const status = await FirebaseFunctions.getServeManagerImportStatus();
      setImportStatus(status);
    } catch (error) {
      console.error("Failed to load import status:", error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleValidateKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your ServeManager API key",
        variant: "destructive"
      });
      return;
    }

    setValidatingKey(true);
    setKeyValidation(null);

    try {
      const result = await FirebaseFunctions.validateServeManagerApiKey(apiKey);
      setKeyValidation(result);

      if (result.valid) {
        toast({
          title: "API Key Valid",
          description: `Connected to ${result.account?.companyName || "ServeManager"}`,
        });
      } else {
        toast({
          title: "Invalid API Key",
          description: result.error || "Please check your API key and try again",
          variant: "destructive"
        });
      }
    } catch (error) {
      setKeyValidation({ valid: false, error: error.message });
      toast({
        title: "Validation Failed",
        description: error.message || "Failed to validate API key",
        variant: "destructive"
      });
    } finally {
      setValidatingKey(false);
    }
  };

  const handleStartImport = async () => {
    if (!keyValidation?.valid) {
      toast({
        title: "Validate Key First",
        description: "Please validate your API key before starting the import",
        variant: "destructive"
      });
      return;
    }

    // Confirm if previous import exists
    if (importStatus?.hasImport && importStatus?.status === "completed") {
      if (!confirm("This will replace your existing imported data. Are you sure you want to continue?")) {
        return;
      }
    }

    setStartingImport(true);

    try {
      const result = await FirebaseFunctions.startServeManagerImport(apiKey);

      toast({
        title: "Import Started",
        description: "Your data import has begun. You'll receive an email when it's complete.",
      });

      // Clear the API key from state for security
      setApiKey("");
      setKeyValidation(null);

      // Reload status
      await loadImportStatus();
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to start import",
        variant: "destructive"
      });
    } finally {
      setStartingImport(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: "bg-amber-100 text-amber-700", icon: Clock, label: "Pending" },
      in_progress: { color: "bg-blue-100 text-blue-700", icon: Loader2, label: "In Progress" },
      completed: { color: "bg-green-100 text-green-700", icon: CheckCircle2, label: "Completed" },
      failed: { color: "bg-red-100 text-red-700", icon: XCircle, label: "Failed" },
    };

    const { color, icon: Icon, label } = config[status] || config.pending;

    return (
      <Badge className={`${color} gap-1`}>
        <Icon className={`w-3 h-3 ${status === "in_progress" ? "animate-spin" : ""}`} />
        {label}
      </Badge>
    );
  };

  const getProgressPercentage = () => {
    if (!importStatus?.progress) return 0;
    const { totalJobs, importedJobs } = importStatus.progress;
    if (!totalJobs || totalJobs === 0) return 0;
    return Math.round((importedJobs / totalJobs) * 100);
  };

  const getStepLabel = (step) => {
    const labels = {
      pending: "Waiting to start",
      account: "Verifying account",
      employees: "Importing employees",
      companies: "Importing companies",
      courts: "Importing courts",
      court_cases: "Importing court cases",
      jobs: "Importing jobs",
      complete: "Import complete",
    };
    return labels[step] || step;
  };

  // Show loading state
  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Data Import</h2>
        <p className="text-slate-600">
          Import your historical data from ServeManager into Diligence as a read-only archive.
        </p>
      </div>

      {/* Import In Progress Banner */}
      {(importStatus?.status === "pending" || importStatus?.status === "in_progress") && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-blue-900">Import In Progress</h3>
                  {getStatusBadge(importStatus.status)}
                </div>
                <p className="text-sm text-blue-700 mb-4">
                  {getStepLabel(importStatus.progress?.currentStep)}
                </p>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Jobs</span>
                    <span className="text-blue-900 font-medium">
                      {importStatus.progress?.importedJobs || 0}
                      {importStatus.progress?.totalJobs ? ` / ${importStatus.progress.totalJobs}` : ""}
                    </span>
                  </div>
                  <Progress value={getProgressPercentage()} className="h-2" />
                </div>

                {importStatus.progress?.totalJobs && (
                  <p className="text-xs text-blue-600 mt-3">
                    You'll receive an email when the import is complete.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Import Summary */}
      {importStatus?.status === "completed" && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-green-900">Import Complete</h3>
                  {getStatusBadge(importStatus.status)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-white/50 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <div className="text-xl font-bold text-green-900">
                      {importStatus.stats?.jobsImported || 0}
                    </div>
                    <div className="text-xs text-green-700">Jobs</div>
                  </div>
                  <div className="text-center p-3 bg-white/50 rounded-lg">
                    <Building2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <div className="text-xl font-bold text-green-900">
                      {importStatus.stats?.companiesImported || 0}
                    </div>
                    <div className="text-xs text-green-700">Companies</div>
                  </div>
                  <div className="text-center p-3 bg-white/50 rounded-lg">
                    <Scale className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <div className="text-xl font-bold text-green-900">
                      {importStatus.stats?.courtCasesImported || 0}
                    </div>
                    <div className="text-xs text-green-700">Court Cases</div>
                  </div>
                  <div className="text-center p-3 bg-white/50 rounded-lg">
                    <Users className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <div className="text-xl font-bold text-green-900">
                      {importStatus.stats?.employeesImported || 0}
                    </div>
                    <div className="text-xs text-green-700">Employees</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-green-700">
                    Completed {importStatus.completedAt ? format(importStatus.completedAt.toDate?.() || new Date(importStatus.completedAt), "MMM d, yyyy 'at' h:mm a") : ""}
                  </p>
                  <Button
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-100"
                    onClick={() => window.location.href = "/LegacyJobs"}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Legacy Data
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed Import */}
      {importStatus?.status === "failed" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Import Failed:</strong> {importStatus.errors?.[importStatus.errors.length - 1]?.message || "Unknown error"}
            <br />
            <span className="text-sm">You can try starting a new import below.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Start New Import Section */}
      {(!importStatus || importStatus.status === "completed" || importStatus.status === "failed") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import from ServeManager
            </CardTitle>
            <CardDescription>
              Import your historical data from ServeManager. This data will be available as a read-only archive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* API Key Input */}
            <div className="space-y-2">
              <Label htmlFor="api-key">ServeManager API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="api-key"
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setKeyValidation(null);
                    }}
                    placeholder="Enter your ServeManager API key"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  onClick={handleValidateKey}
                  disabled={validatingKey || !apiKey.trim()}
                  variant="outline"
                >
                  {validatingKey ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Validate
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Find your API key in ServeManager: My Account → Settings → Integrations → API Keys
              </p>
            </div>

            {/* Validation Result */}
            {keyValidation && (
              <div className={`p-4 rounded-lg ${keyValidation.valid ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                <div className="flex items-center gap-2">
                  {keyValidation.valid ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">API Key Valid</p>
                        <p className="text-sm text-green-700">
                          Connected to: {keyValidation.account?.companyName || "ServeManager"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-900">Invalid API Key</p>
                        <p className="text-sm text-red-700">{keyValidation.error}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Start Import Button */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-slate-500">
                <Info className="w-4 h-4 inline mr-1" />
                Large accounts may take several hours to import.
              </div>
              <Button
                onClick={handleStartImport}
                disabled={!keyValidation?.valid || startingImport}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {startingImport ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Start Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-slate-50">
        <CardContent className="p-6">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Database className="w-5 h-5" />
            What gets imported?
          </h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>All jobs with service attempts, notes, and status history</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Document metadata and download links (documents are not copied)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Companies, clients, and contact information</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Court cases and court information</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Employees and process servers</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Invoice and payment history</span>
            </li>
          </ul>

          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              <strong>Note:</strong> Imported data is read-only. You cannot edit or modify historical data.
              Document links point to ServeManager and may require an active subscription to access.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
