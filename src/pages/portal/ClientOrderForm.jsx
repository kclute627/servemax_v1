import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Upload,
  FileText,
  X,
  MapPin,
  Building2,
  User,
  Briefcase,
  Plus,
  Check,
  Download,
  Table,
  Trash2,
  Copy,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useClientAuth } from "@/components/auth/ClientAuthProvider";
import AddressAutocomplete from "@/components/jobs/AddressAutocomplete";
import CourtAutocomplete from "@/components/jobs/CourtAutocomplete";
import { FirebaseStorage } from "@/firebase/storage";
import { FirebaseFunctions } from "@/firebase/functions";
import { PDFDocument } from 'pdf-lib';

// Simplified document upload for client portal
function ClientDocumentUpload({ documents, onDocumentsChange }) {
  const { toast } = useToast();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    await uploadFiles(files);
  };

  const getPageCount = async (file) => {
    try {
      if (file.type !== 'application/pdf') {
        return file.type.startsWith('image/') ? 1 : null;
      }
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      return pdfDoc.getPageCount();
    } catch (error) {
      console.error('Error reading PDF page count:', error);
      return Math.max(1, Math.round(file.size / 100000));
    }
  };

  const uploadFiles = async (files) => {
    if (files.length === 0) return;

    setIsUploading(true);
    const newDocuments = [];

    try {
      for (const file of files) {
        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
          toast({
            variant: "destructive",
            title: "Invalid file type",
            description: `${file.name} is not a supported file type. Please upload PDF or image files.`
          });
          continue;
        }

        // Validate file size (max 25MB)
        if (file.size > 25 * 1024 * 1024) {
          toast({
            variant: "destructive",
            title: "File too large",
            description: `${file.name} exceeds the 25MB limit.`
          });
          continue;
        }

        // Get page count for PDFs
        const pageCount = await getPageCount(file);

        // Upload to Firebase Storage
        const uploadResult = await FirebaseStorage.uploadFile(file, 'job-documents');

        newDocuments.push({
          id: uploadResult.id || Date.now().toString(),
          name: file.name,
          url: uploadResult.url,
          file_path: uploadResult.path,
          content_type: file.type,
          size: file.size,
          page_count: pageCount,
          uploaded_at: new Date().toISOString()
        });
      }

      if (newDocuments.length > 0) {
        onDocumentsChange([...documents, ...newDocuments]);
        toast({
          title: "Documents uploaded",
          description: `${newDocuments.length} document(s) uploaded successfully.`
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload documents. Please try again."
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveDocument = (docId) => {
    onDocumentsChange(documents.filter(d => d.id !== docId));
  };

  const totalPages = documents.reduce((sum, doc) => sum + (doc.page_count || 0), 0);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.gif"
          onChange={handleFileSelect}
          className="hidden"
          id="client-file-upload"
          disabled={isUploading}
        />
        <label
          htmlFor="client-file-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          {isUploading ? (
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
          ) : (
            <Upload className="w-10 h-10 text-slate-400 mb-3" />
          )}
          <p className="text-sm font-medium text-slate-700">
            {isUploading ? 'Uploading...' : 'Drop files here or click to upload'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            PDF or image files up to 25MB
          </p>
        </label>
      </div>

      {/* Document List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{documents.length} document(s)</span>
            <span>{totalPages} total page(s)</span>
          </div>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {doc.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {doc.page_count ? `${doc.page_count} page(s)` : 'Processing...'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveDocument(doc.id)}
                className="shrink-0 text-slate-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// CSV Template for bulk upload
const CSV_TEMPLATE = `recipient_name,recipient_type,address1,address2,city,state,postal_code,case_number,court_name,plaintiff,defendant,priority,service_instructions,client_reference
"John Doe",individual,"123 Main St","Apt 4","Los Angeles",CA,90001,"2024-CV-12345","Los Angeles Superior Court","ABC Corp","John Doe",standard,"Leave at door if not home","REF-001"
"Jane Smith Corp",business,"456 Oak Ave","Suite 100","San Diego",CA,92101,"2024-CV-67890","San Diego Superior Court","XYZ Inc","Jane Smith Corp",rush,"Call before arriving","REF-002"`;

// Multi-row bulk entry form component
function BulkOrderForm({ onSubmit, isSubmitting, primaryColor }) {
  const [rows, setRows] = useState([createEmptyRow()]);

  function createEmptyRow() {
    return {
      id: Date.now() + Math.random(),
      recipient_name: "",
      recipient_type: "individual",
      address1: "",
      address2: "",
      city: "",
      state: "",
      postal_code: "",
      case_number: "",
      court_name: "",
      plaintiff: "",
      defendant: "",
      priority: "standard",
      service_instructions: "",
      client_reference: "",
      documents: []
    };
  }

  const addRow = () => {
    setRows([...rows, createEmptyRow()]);
  };

  const duplicateRow = (index) => {
    const rowToDuplicate = rows[index];
    const newRow = { ...rowToDuplicate, id: Date.now() + Math.random(), documents: [...rowToDuplicate.documents] };
    const newRows = [...rows];
    newRows.splice(index + 1, 0, newRow);
    setRows(newRows);
  };

  const removeRow = (index) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const updateRow = (index, field, value) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const validateRows = () => {
    const errors = [];
    rows.forEach((row, index) => {
      if (!row.recipient_name.trim()) {
        errors.push(`Row ${index + 1}: Recipient name is required`);
      }
      if (!row.address1.trim() || !row.city.trim() || !row.state.trim()) {
        errors.push(`Row ${index + 1}: Complete address is required`);
      }
    });
    return errors;
  };

  const handleSubmit = () => {
    const errors = validateRows();
    if (errors.length > 0) {
      onSubmit(null, errors);
      return;
    }
    onSubmit(rows, []);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Add multiple orders at once. Each row creates a separate order.
        </p>
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="w-4 h-4 mr-2" />
          Add Row
        </Button>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {rows.map((row, index) => (
          <Card key={row.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Order #{index + 1}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => duplicateRow(index)}
                    title="Duplicate row"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  {rows.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(index)}
                      className="text-red-500 hover:text-red-700"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Recipient Name *</Label>
                  <Input
                    value={row.recipient_name}
                    onChange={(e) => updateRow(index, 'recipient_name', e.target.value)}
                    placeholder="Name"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <select
                    value={row.recipient_type}
                    onChange={(e) => updateRow(index, 'recipient_type', e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-slate-200 text-sm"
                  >
                    <option value="individual">Individual</option>
                    <option value="business">Business</option>
                    <option value="government">Government</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Case Number</Label>
                  <Input
                    value={row.case_number}
                    onChange={(e) => updateRow(index, 'case_number', e.target.value)}
                    placeholder="Case #"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Priority</Label>
                  <select
                    value={row.priority}
                    onChange={(e) => updateRow(index, 'priority', e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-slate-200 text-sm"
                  >
                    <option value="standard">Standard</option>
                    <option value="rush">Rush</option>
                    <option value="same_day">Same Day</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <Label className="text-xs">Address *</Label>
                  <Input
                    value={row.address1}
                    onChange={(e) => updateRow(index, 'address1', e.target.value)}
                    placeholder="Street address"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Unit/Suite</Label>
                  <Input
                    value={row.address2}
                    onChange={(e) => updateRow(index, 'address2', e.target.value)}
                    placeholder="Apt, Suite"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Reference</Label>
                  <Input
                    value={row.client_reference}
                    onChange={(e) => updateRow(index, 'client_reference', e.target.value)}
                    placeholder="Your ref #"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">City *</Label>
                  <Input
                    value={row.city}
                    onChange={(e) => updateRow(index, 'city', e.target.value)}
                    placeholder="City"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">State *</Label>
                  <Input
                    value={row.state}
                    onChange={(e) => updateRow(index, 'state', e.target.value)}
                    placeholder="ST"
                    maxLength={2}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">ZIP</Label>
                  <Input
                    value={row.postal_code}
                    onChange={(e) => updateRow(index, 'postal_code', e.target.value)}
                    placeholder="ZIP"
                    className="h-9"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Instructions</Label>
                  <Input
                    value={row.service_instructions}
                    onChange={(e) => updateRow(index, 'service_instructions', e.target.value)}
                    placeholder="Special instructions"
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-slate-500">
          {rows.length} order(s) ready to submit
        </p>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{ backgroundColor: primaryColor }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting {rows.length} Orders...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Submit {rows.length} Order{rows.length > 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// CSV Upload component
function CSVUploadForm({ onSubmit, isSubmitting, primaryColor }) {
  const fileInputRef = useRef(null);
  const [parsedData, setParsedData] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [fileName, setFileName] = useState("");

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'order_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return { data: [], errors: ['CSV file must have a header row and at least one data row'] };
    }

    // Parse header
    const header = parseCSVLine(lines[0]);
    const requiredFields = ['recipient_name', 'address1', 'city', 'state'];
    const missingFields = requiredFields.filter(f => !header.includes(f));

    if (missingFields.length > 0) {
      return { data: [], errors: [`Missing required columns: ${missingFields.join(', ')}`] };
    }

    const data = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0 || values.every(v => !v.trim())) continue; // Skip empty rows

      const row = {};
      header.forEach((col, idx) => {
        row[col.trim()] = values[idx]?.trim() || '';
      });

      // Validate required fields
      if (!row.recipient_name) {
        errors.push(`Row ${i}: Missing recipient name`);
      }
      if (!row.address1 || !row.city || !row.state) {
        errors.push(`Row ${i}: Missing required address fields`);
      }

      // Set defaults
      row.recipient_type = row.recipient_type || 'individual';
      row.priority = row.priority || 'standard';
      row.id = Date.now() + i;
      row.documents = [];

      data.push(row);
    }

    return { data, errors };
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        const { data, errors } = parseCSV(text);
        setParsedData(data);
        setParseErrors(errors);
      }
    };
    reader.readAsText(file);
  };

  const clearFile = () => {
    setParsedData([]);
    setParseErrors([]);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (parseErrors.length > 0) {
      onSubmit(null, parseErrors);
      return;
    }
    if (parsedData.length === 0) {
      onSubmit(null, ['No valid data to submit']);
      return;
    }
    onSubmit(parsedData, []);
  };

  return (
    <div className="space-y-6">
      {/* Template Download */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Download className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-900">Download Template</h4>
            <p className="text-sm text-blue-700 mt-1">
              Start with our CSV template to ensure your data is formatted correctly.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={downloadTemplate}
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
          </div>
        </div>
      </div>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="w-5 h-5" />
            Upload CSV File
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-file-upload"
          />

          {!fileName ? (
            <label
              htmlFor="csv-file-upload"
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
            >
              <Table className="w-10 h-10 text-slate-400 mb-3" />
              <p className="text-sm font-medium text-slate-700">Click to select CSV file</p>
              <p className="text-xs text-slate-500 mt-1">or drag and drop</p>
            </label>
          ) : (
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-medium text-slate-900">{fileName}</p>
                    <p className="text-sm text-slate-500">
                      {parsedData.length} order(s) found
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFile}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parse Errors */}
      {parseErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <div className="font-medium">Please fix the following issues:</div>
            <ul className="mt-2 list-disc list-inside text-sm">
              {parseErrors.slice(0, 5).map((error, i) => (
                <li key={i}>{error}</li>
              ))}
              {parseErrors.length > 5 && (
                <li>... and {parseErrors.length - 5} more errors</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Table */}
      {parsedData.length > 0 && parseErrors.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview ({parsedData.length} orders)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Recipient</th>
                    <th className="text-left p-2">Address</th>
                    <th className="text-left p-2">Case #</th>
                    <th className="text-left p-2">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{i + 1}</td>
                      <td className="p-2">{row.recipient_name}</td>
                      <td className="p-2">{row.address1}, {row.city}, {row.state}</td>
                      <td className="p-2">{row.case_number || '-'}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="capitalize">
                          {row.priority}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 10 && (
                <p className="text-center text-sm text-slate-500 py-2">
                  ... and {parsedData.length - 10} more rows
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      {parsedData.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || parseErrors.length > 0}
            style={{ backgroundColor: primaryColor }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting {parsedData.length} Orders...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Submit {parsedData.length} Orders
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ClientOrderForm() {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clientUser, portalData, refreshPortalData } = useClientAuth();

  const [activeTab, setActiveTab] = useState("single");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);

  const [formData, setFormData] = useState({
    // Case Information
    case_number: "",
    plaintiff: "",
    defendant: "",

    // Court Information
    court_name: "",
    court_county: "",

    // Recipient Information
    recipient_name: "",
    recipient_type: "individual",

    // Service Address
    address1: "",
    address2: "",
    city: "",
    state: "",
    postal_code: "",
    latitude: null,
    longitude: null,

    // Service Details
    priority: "standard",
    service_instructions: "",
    client_reference: ""
  });

  const branding = portalData?.branding || {};
  const primaryColor = branding.primary_color || '#1e40af';

  // Get priority options from portal data or use defaults
  const priorityOptions = [
    { name: "standard", label: "Standard", description: "Regular processing time" },
    { name: "rush", label: "Rush", description: "Expedited processing" },
    { name: "same_day", label: "Same Day", description: "Same day service" }
  ];

  const recipientTypes = [
    { value: "individual", label: "Individual" },
    { value: "business", label: "Business/Company" },
    { value: "government", label: "Government Entity" }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressSelect = (addressDetails) => {
    setFormData(prev => ({
      ...prev,
      address1: addressDetails.address1 || '',
      address2: addressDetails.address2 || '',
      city: addressDetails.city || '',
      state: addressDetails.state || '',
      postal_code: addressDetails.postal_code || '',
      latitude: addressDetails.latitude || null,
      longitude: addressDetails.longitude || null
    }));
  };

  const handleCourtSelect = (court) => {
    setFormData(prev => ({
      ...prev,
      court_name: court.name || '',
      court_county: court.county || ''
    }));
  };

  const validateForm = () => {
    const errors = [];

    if (documents.length === 0) {
      errors.push("Please upload at least one document");
    }

    if (!formData.recipient_name.trim()) {
      errors.push("Recipient name is required");
    }

    if (!formData.address1.trim() || !formData.city.trim() || !formData.state.trim()) {
      errors.push("Complete service address is required");
    }

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      toast({
        variant: "destructive",
        title: "Please fix the following:",
        description: errors.join(", ")
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare job data for submission
      const jobData = {
        // Case info
        case_number: formData.case_number.trim(),
        plaintiff: formData.plaintiff.trim(),
        defendant_name: formData.defendant.trim() || formData.recipient_name.trim(),

        // Court info
        court_name: formData.court_name.trim(),
        court_county: formData.court_county.trim(),

        // Recipient info
        recipient_name: formData.recipient_name.trim(),
        recipient_type: formData.recipient_type,

        // Address as array (matching existing job structure)
        addresses: [{
          label: "Service Address",
          address1: formData.address1,
          address2: formData.address2,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          latitude: formData.latitude,
          longitude: formData.longitude,
          primary: true
        }],

        // Service details
        priority: formData.priority,
        service_instructions: formData.service_instructions.trim(),
        client_job_number: formData.client_reference.trim(),

        // Documents
        uploaded_documents: documents.map(doc => ({
          id: doc.id,
          name: doc.name,
          url: doc.url,
          file_path: doc.file_path,
          content_type: doc.content_type,
          size: doc.size,
          page_count: doc.page_count
        })),
        document_count: documents.length
      };

      // Call the cloud function to create the job
      const result = await FirebaseFunctions.createClientJob(jobData);

      if (result.success) {
        toast({
          title: "Order submitted successfully!",
          description: `Order #${result.job_number || result.job_id} has been created.`
        });
        // Wait for Firestore eventual consistency before refreshing
        await new Promise(resolve => setTimeout(resolve, 1500));
        await refreshPortalData();
        navigate(`/portal/${companySlug}/orders`);
      } else {
        throw new Error(result.error || "Failed to create order");
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error.message || "Failed to submit order. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle bulk job submission (from multi-row form or CSV)
  const handleBulkSubmit = async (jobs, errors) => {
    if (errors && errors.length > 0) {
      toast({
        variant: "destructive",
        title: "Please fix the following:",
        description: errors.slice(0, 3).join(", ") + (errors.length > 3 ? ` and ${errors.length - 3} more errors` : "")
      });
      return;
    }

    if (!jobs || jobs.length === 0) {
      toast({
        variant: "destructive",
        title: "No orders to submit",
        description: "Please add at least one order"
      });
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const job of jobs) {
        try {
          const jobData = {
            case_number: job.case_number?.trim() || "",
            plaintiff: job.plaintiff?.trim() || "",
            defendant_name: job.defendant?.trim() || job.recipient_name?.trim() || "",
            court_name: job.court_name?.trim() || "",
            court_county: job.court_county?.trim() || "",
            recipient_name: job.recipient_name?.trim() || "",
            recipient_type: job.recipient_type || "individual",
            addresses: [{
              label: "Service Address",
              address1: job.address1 || "",
              address2: job.address2 || "",
              city: job.city || "",
              state: job.state || "",
              postal_code: job.postal_code || "",
              latitude: job.latitude || null,
              longitude: job.longitude || null,
              primary: true
            }],
            priority: job.priority || "standard",
            service_instructions: job.service_instructions?.trim() || "",
            client_job_number: job.client_reference?.trim() || "",
            uploaded_documents: job.documents || [],
            document_count: job.documents?.length || 0
          };

          const result = await FirebaseFunctions.createClientJob(jobData);
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          console.error('Error creating job:', err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: `${successCount} order(s) submitted successfully!`,
          description: errorCount > 0 ? `${errorCount} order(s) failed to submit.` : undefined
        });
        // Wait for Firestore eventual consistency before refreshing
        await new Promise(resolve => setTimeout(resolve, 1500));
        await refreshPortalData();
        navigate(`/portal/${companySlug}/orders`);
      } else {
        toast({
          variant: "destructive",
          title: "All orders failed to submit",
          description: "Please try again or contact support."
        });
      }
    } catch (error) {
      console.error('Bulk submission error:', error);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error.message || "Failed to submit orders. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user has permission to create orders
  if (clientUser?.role === 'viewer') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Briefcase className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h1>
        <p className="text-slate-600 mb-6">
          You don't have permission to submit new orders. Please contact your administrator.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate(`/portal/${companySlug}/orders`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/portal/${companySlug}/orders`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Submit New Order</h1>
          <p className="text-slate-500">Choose how you want to submit orders</p>
        </div>
      </div>

      {/* Tabs for different submission methods */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Single Order</span>
            <span className="sm:hidden">Single</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Table className="w-4 h-4" />
            <span className="hidden sm:inline">Bulk Entry</span>
            <span className="sm:hidden">Bulk</span>
          </TabsTrigger>
          <TabsTrigger value="csv" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">CSV Upload</span>
            <span className="sm:hidden">CSV</span>
          </TabsTrigger>
        </TabsList>

        {/* Single Order Form Tab */}
        <TabsContent value="single" className="space-y-6 mt-6">
          {/* Document Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents
              </CardTitle>
              <CardDescription>
                Upload the documents to be served (required)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientDocumentUpload
                documents={documents}
                onDocumentsChange={setDocuments}
              />
            </CardContent>
          </Card>

      {/* Recipient Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Recipient Information
          </CardTitle>
          <CardDescription>
            Who should be served with these documents?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipient_name">
                Recipient Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="recipient_name"
                value={formData.recipient_name}
                onChange={(e) => handleInputChange('recipient_name', e.target.value)}
                placeholder="Full name of person or company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient_type">Recipient Type</Label>
              <Select
                value={formData.recipient_type}
                onValueChange={(value) => handleInputChange('recipient_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {recipientTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Service Address
          </CardTitle>
          <CardDescription>
            Where should service be attempted?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>
              Address <span className="text-red-500">*</span>
            </Label>
            <AddressAutocomplete
              value={formData.address1}
              onChange={(value) => handleInputChange('address1', value)}
              onAddressSelect={handleAddressSelect}
              onLoadingChange={setIsAddressLoading}
              placeholder="Start typing an address..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address2">Unit/Suite/Apt (optional)</Label>
            <Input
              id="address2"
              value={formData.address2}
              onChange={(e) => handleInputChange('address2', e.target.value)}
              placeholder="Unit 123, Suite A, etc."
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                placeholder="State"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">ZIP Code</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => handleInputChange('postal_code', e.target.value)}
                placeholder="ZIP"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Service Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Priority</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {priorityOptions.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => handleInputChange('priority', option.name)}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    formData.priority === option.name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  style={formData.priority === option.name ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{option.label}</span>
                    {formData.priority === option.name && (
                      <Check className="w-5 h-5" style={{ color: primaryColor }} />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_instructions">Service Instructions (optional)</Label>
            <Textarea
              id="service_instructions"
              value={formData.service_instructions}
              onChange={(e) => handleInputChange('service_instructions', e.target.value)}
              placeholder="Any special instructions for the process server..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_reference">Your Reference Number (optional)</Label>
            <Input
              id="client_reference"
              value={formData.client_reference}
              onChange={(e) => handleInputChange('client_reference', e.target.value)}
              placeholder="Your internal reference or matter number"
            />
          </div>
        </CardContent>
      </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pb-8">
            <Button
              variant="outline"
              onClick={() => navigate(`/portal/${companySlug}/orders`)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{ backgroundColor: primaryColor }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Submit Order
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Bulk Entry Tab */}
        <TabsContent value="bulk" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table className="w-5 h-5" />
                Bulk Order Entry
              </CardTitle>
              <CardDescription>
                Enter multiple orders using an easy-to-use form. Great for 2-20 orders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkOrderForm
                onSubmit={handleBulkSubmit}
                isSubmitting={isSubmitting}
                primaryColor={primaryColor}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* CSV Upload Tab */}
        <TabsContent value="csv" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                CSV Upload
              </CardTitle>
              <CardDescription>
                Upload a CSV file with multiple orders. Best for 10+ orders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CSVUploadForm
                onSubmit={handleBulkSubmit}
                isSubmitting={isSubmitting}
                primaryColor={primaryColor}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
