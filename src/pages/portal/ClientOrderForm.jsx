import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Upload,
  FileText,
  X,
  MapPin,
  User,
  Briefcase,
  Plus,
  Check,
  Download,
  Table,
  Trash2,
  Copy,
  AlertCircle,
  ChevronRight,
  Zap,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { FirebaseStorage } from "@/firebase/storage";
import { FirebaseFunctions } from "@/firebase/functions";
import { PDFDocument } from 'pdf-lib';
import { JOB_TYPES, JOB_TYPE_LABELS } from "@/firebase/schemas";

// Simplified document upload for client portal
function ClientDocumentUpload({ documents, onDocumentsChange, primaryColor }) {
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
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
          toast({
            variant: "destructive",
            title: "Invalid file type",
            description: `${file.name} is not a supported file type. Please upload PDF or image files.`
          });
          continue;
        }

        if (file.size > 25 * 1024 * 1024) {
          toast({
            variant: "destructive",
            title: "File too large",
            description: `${file.name} exceeds the 25MB limit.`
          });
          continue;
        }

        const pageCount = await getPageCount(file);
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
        className={`
          border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer
          ${isDragOver
            ? 'border-blue-400 bg-blue-50'
            : documents.length > 0
              ? 'border-slate-200 bg-slate-50 hover:border-slate-300'
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
          }
        `}
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
        <label htmlFor="client-file-upload" className="cursor-pointer flex flex-col items-center">
          {isUploading ? (
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
              <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: `${primaryColor}10` }}
            >
              <Upload className="w-7 h-7" style={{ color: primaryColor }} />
            </div>
          )}
          <p className="font-semibold text-slate-900 mb-1">
            {isUploading ? 'Uploading...' : 'Drop files here or click to upload'}
          </p>
          <p className="text-sm text-slate-500">
            PDF or image files up to 25MB each
          </p>
        </label>
      </div>

      {/* Document List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{documents.length} document(s)</span>
            <span className="text-slate-500">{totalPages} total page(s)</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
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
                  className="shrink-0 text-slate-400 hover:text-rose-500 hover:bg-rose-50 -mr-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// CSV Template
const CSV_TEMPLATE = `recipient_name,recipient_type,address1,address2,city,state,postal_code,case_number,court_name,plaintiff,defendant,priority,service_instructions,client_reference
"John Doe",individual,"123 Main St","Apt 4","Los Angeles",CA,90001,"2024-CV-12345","Los Angeles Superior Court","ABC Corp","John Doe",standard,"Leave at door if not home","REF-001"`;

// Multi-row bulk entry form
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
      priority: "standard",
      service_instructions: "",
      client_reference: "",
      documents: []
    };
  }

  const addRow = () => setRows([...rows, createEmptyRow()]);
  const duplicateRow = (index) => {
    const rowToDuplicate = rows[index];
    const newRow = { ...rowToDuplicate, id: Date.now() + Math.random(), documents: [...rowToDuplicate.documents] };
    const newRows = [...rows];
    newRows.splice(index + 1, 0, newRow);
    setRows(newRows);
  };
  const removeRow = (index) => rows.length > 1 && setRows(rows.filter((_, i) => i !== index));
  const updateRow = (index, field, value) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const validateRows = () => {
    const errors = [];
    rows.forEach((row, index) => {
      if (!row.recipient_name.trim()) errors.push(`Row ${index + 1}: Recipient name is required`);
      if (!row.address1.trim() || !row.city.trim() || !row.state.trim()) {
        errors.push(`Row ${index + 1}: Complete address is required`);
      }
    });
    return errors;
  };

  const handleSubmit = () => {
    const errors = validateRows();
    onSubmit(errors.length > 0 ? null : rows, errors);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Add multiple orders at once. Each row creates a separate order.
        </p>
        <Button variant="outline" size="sm" onClick={addRow} className="rounded-lg">
          <Plus className="w-4 h-4 mr-2" />
          Add Row
        </Button>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {rows.map((row, index) => (
          <div key={row.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-900">Order #{index + 1}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => duplicateRow(index)} title="Duplicate" className="h-8 w-8 p-0">
                  <Copy className="w-4 h-4 text-slate-400" />
                </Button>
                {rows.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeRow(index)} className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-slate-600">Recipient Name *</Label>
                <Input value={row.recipient_name} onChange={(e) => updateRow(index, 'recipient_name', e.target.value)} placeholder="Name" className="h-9 rounded-lg" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Type</Label>
                <select value={row.recipient_type} onChange={(e) => updateRow(index, 'recipient_type', e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white">
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-slate-600">Address *</Label>
                <Input value={row.address1} onChange={(e) => updateRow(index, 'address1', e.target.value)} placeholder="Street address" className="h-9 rounded-lg" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mt-3">
              <div className="col-span-2">
                <Label className="text-xs text-slate-600">City *</Label>
                <Input value={row.city} onChange={(e) => updateRow(index, 'city', e.target.value)} placeholder="City" className="h-9 rounded-lg" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">State *</Label>
                <Input value={row.state} onChange={(e) => updateRow(index, 'state', e.target.value)} placeholder="ST" maxLength={2} className="h-9 rounded-lg" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">ZIP</Label>
                <Input value={row.postal_code} onChange={(e) => updateRow(index, 'postal_code', e.target.value)} placeholder="ZIP" className="h-9 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <p className="text-sm text-slate-500">{rows.length} order(s) ready</p>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="text-white" style={{ backgroundColor: primaryColor }}>
          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
          Submit {rows.length} Order{rows.length > 1 ? 's' : ''}
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

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
      else current += char;
    }
    result.push(current);
    return result;
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return { data: [], errors: ['CSV file must have a header row and at least one data row'] };
    const header = parseCSVLine(lines[0]);
    const requiredFields = ['recipient_name', 'address1', 'city', 'state'];
    const missingFields = requiredFields.filter(f => !header.includes(f));
    if (missingFields.length > 0) return { data: [], errors: [`Missing required columns: ${missingFields.join(', ')}`] };
    const data = [];
    const errors = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0 || values.every(v => !v.trim())) continue;
      const row = {};
      header.forEach((col, idx) => { row[col.trim()] = values[idx]?.trim() || ''; });
      if (!row.recipient_name) errors.push(`Row ${i}: Missing recipient name`);
      if (!row.address1 || !row.city || !row.state) errors.push(`Row ${i}: Missing required address fields`);
      row.recipient_type = row.recipient_type || 'individual';
      row.priority = row.priority || 'standard';
      row.id = Date.now() + i;
      row.documents = [];
      data.push(row);
    }
    return { data, errors };
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    if (parseErrors.length > 0) { onSubmit(null, parseErrors); return; }
    if (parsedData.length === 0) { onSubmit(null, ['No valid data to submit']); return; }
    onSubmit(parsedData, []);
  };

  return (
    <div className="space-y-6">
      {/* Template Download */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-blue-900">Download Template</p>
            <p className="text-sm text-blue-700 mt-0.5">Start with our CSV template to ensure your data is formatted correctly.</p>
            <Button variant="outline" size="sm" className="mt-3 bg-white" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" id="csv-file-upload" />
        {!fileName ? (
          <label htmlFor="csv-file-upload" className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
              <Table className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-medium text-slate-700">Click to select CSV file</p>
            <p className="text-sm text-slate-500 mt-1">or drag and drop</p>
          </label>
        ) : (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{fileName}</p>
                <p className="text-sm text-slate-500">{parsedData.length} order(s) found</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFile} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Parse Errors */}
      {parseErrors.length > 0 && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <div className="font-medium">Please fix the following issues:</div>
            <ul className="mt-2 list-disc list-inside text-sm">
              {parseErrors.slice(0, 5).map((error, i) => <li key={i}>{error}</li>)}
              {parseErrors.length > 5 && <li>... and {parseErrors.length - 5} more errors</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Table */}
      {parsedData.length > 0 && parseErrors.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <p className="font-medium text-slate-900">Preview ({parsedData.length} orders)</p>
          </div>
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-3 font-medium text-slate-600">#</th>
                  <th className="text-left p-3 font-medium text-slate-600">Recipient</th>
                  <th className="text-left p-3 font-medium text-slate-600">Address</th>
                  <th className="text-left p-3 font-medium text-slate-600">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedData.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-600">{i + 1}</td>
                    <td className="p-3 font-medium text-slate-900">{row.recipient_name}</td>
                    <td className="p-3 text-slate-600">{row.address1}, {row.city}, {row.state}</td>
                    <td className="p-3"><Badge variant="outline" className="capitalize">{row.priority}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedData.length > 10 && (
              <p className="text-center text-sm text-slate-500 py-3 border-t border-slate-100">
                ... and {parsedData.length - 10} more rows
              </p>
            )}
          </div>
        </div>
      )}

      {/* Submit Button */}
      {parsedData.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isSubmitting || parseErrors.length > 0} className="text-white" style={{ backgroundColor: primaryColor }}>
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Submit {parsedData.length} Orders
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
    job_type: JOB_TYPES.PROCESS_SERVING,
    case_number: "",
    plaintiff: "",
    defendant: "",
    court_name: "",
    court_county: "",
    recipient_name: "",
    recipient_type: "individual",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postal_code: "",
    latitude: null,
    longitude: null,
    priority: "standard",
    service_instructions: "",
    client_reference: ""
  });

  const branding = portalData?.branding || {};
  const primaryColor = branding.primary_color || '#0f172a';

  const priorityOptions = [
    { name: "standard", label: "Standard", description: "Regular processing", icon: Clock },
    { name: "rush", label: "Rush", description: "Expedited service", icon: Zap },
    { name: "same_day", label: "Same Day", description: "Urgent priority", icon: AlertCircle }
  ];

  const recipientTypes = [
    { value: "individual", label: "Individual" },
    { value: "business", label: "Business/Company" },
    { value: "government", label: "Government Entity" }
  ];

  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

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

  const validateForm = () => {
    const errors = [];
    if (documents.length === 0) errors.push("Please upload at least one document");
    if (!formData.recipient_name.trim()) errors.push("Recipient name is required");
    if (!formData.address1.trim() || !formData.city.trim() || !formData.state.trim()) {
      errors.push("Complete service address is required");
    }
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      toast({ variant: "destructive", title: "Please fix the following:", description: errors.join(", ") });
      return;
    }

    setIsSubmitting(true);

    try {
      const jobData = {
        job_type: formData.job_type,
        case_number: formData.case_number.trim(),
        plaintiff: formData.plaintiff.trim(),
        defendant_name: formData.defendant.trim() || formData.recipient_name.trim(),
        court_name: formData.court_name.trim(),
        court_county: formData.court_county.trim(),
        recipient_name: formData.recipient_name.trim(),
        recipient_type: formData.recipient_type,
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
        priority: formData.priority,
        service_instructions: formData.service_instructions.trim(),
        client_job_number: formData.client_reference.trim(),
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

      const result = await FirebaseFunctions.createClientJob(jobData);

      if (result.success) {
        toast({ title: "Order submitted successfully!", description: `Order #${result.job_number || result.job_id} has been created.` });
        await new Promise(resolve => setTimeout(resolve, 1500));
        await refreshPortalData();
        navigate(`/portal/${companySlug}/orders`);
      } else {
        throw new Error(result.error || "Failed to create order");
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      toast({ variant: "destructive", title: "Submission failed", description: error.message || "Failed to submit order. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSubmit = async (jobs, errors) => {
    if (errors && errors.length > 0) {
      toast({ variant: "destructive", title: "Please fix the following:", description: errors.slice(0, 3).join(", ") + (errors.length > 3 ? ` and ${errors.length - 3} more errors` : "") });
      return;
    }

    if (!jobs || jobs.length === 0) {
      toast({ variant: "destructive", title: "No orders to submit", description: "Please add at least one order" });
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
          if (result.success) successCount++;
          else errorCount++;
        } catch (err) {
          console.error('Error creating job:', err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({ title: `${successCount} order(s) submitted successfully!`, description: errorCount > 0 ? `${errorCount} order(s) failed to submit.` : undefined });
        await new Promise(resolve => setTimeout(resolve, 1500));
        await refreshPortalData();
        navigate(`/portal/${companySlug}/orders`);
      } else {
        toast({ variant: "destructive", title: "All orders failed to submit", description: "Please try again or contact support." });
      }
    } catch (error) {
      console.error('Bulk submission error:', error);
      toast({ variant: "destructive", title: "Submission failed", description: error.message || "Failed to submit orders. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Viewer restriction
  if (clientUser?.role === 'viewer') {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Briefcase className="w-8 h-8 text-slate-300" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h1>
        <p className="text-slate-500 mb-6">You don't have permission to submit new orders.</p>
        <Button variant="outline" onClick={() => navigate(`/portal/${companySlug}/orders`)} className="rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/portal/${companySlug}/orders`)}
          className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Order</h1>
          <p className="text-slate-500 mt-0.5">Submit a new service request</p>
        </div>
      </div>

      {/* Tab Selection */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
        {[
          { id: 'single', label: 'Single Order', icon: User },
          { id: 'bulk', label: 'Bulk Entry', icon: Table },
          { id: 'csv', label: 'CSV Upload', icon: Upload }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Single Order Form */}
      {activeTab === 'single' && (
        <div className="space-y-6">
          {/* Documents Section */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}10` }}>
                  <FileText className="w-4 h-4" style={{ color: primaryColor }} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Documents</h2>
                  <p className="text-sm text-slate-500">Upload the documents to be served</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <ClientDocumentUpload
                documents={documents}
                onDocumentsChange={setDocuments}
                primaryColor={primaryColor}
              />
            </div>
          </div>

          {/* Recipient Section */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Recipient</h2>
                  <p className="text-sm text-slate-500">Who should be served?</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">Recipient Name <span className="text-rose-500">*</span></Label>
                  <Input
                    value={formData.recipient_name}
                    onChange={(e) => handleInputChange('recipient_name', e.target.value)}
                    placeholder="Full name of person or company"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">Recipient Type</Label>
                  <Select value={formData.recipient_type} onValueChange={(value) => handleInputChange('recipient_type', value)}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipientTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Service Address</h2>
                  <p className="text-sm text-slate-500">Where should service be attempted?</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Address <span className="text-rose-500">*</span></Label>
                <AddressAutocomplete
                  value={formData.address1}
                  onChange={(value) => handleInputChange('address1', value)}
                  onAddressSelect={handleAddressSelect}
                  onLoadingChange={setIsAddressLoading}
                  placeholder="Start typing an address..."
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Unit/Suite/Apt</Label>
                <Input
                  value={formData.address2}
                  onChange={(e) => handleInputChange('address2', e.target.value)}
                  placeholder="Unit 123, Suite A, etc."
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label className="text-slate-700">City</Label>
                  <Input value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} placeholder="City" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">State</Label>
                  <Input value={formData.state} onChange={(e) => handleInputChange('state', e.target.value)} placeholder="ST" maxLength={2} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">ZIP</Label>
                  <Input value={formData.postal_code} onChange={(e) => handleInputChange('postal_code', e.target.value)} placeholder="ZIP" className="h-11 rounded-xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Service Options Section */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Service Options</h2>
                  <p className="text-sm text-slate-500">Priority and special instructions</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-5">
              {/* Priority Selection */}
              <div className="space-y-3">
                <Label className="text-slate-700">Priority</Label>
                <div className="grid grid-cols-3 gap-3">
                  {priorityOptions.map((option) => {
                    const isSelected = formData.priority === option.name;
                    return (
                      <button
                        key={option.name}
                        type="button"
                        onClick={() => handleInputChange('priority', option.name)}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                          isSelected ? 'border-current bg-opacity-5' : 'border-slate-200 hover:border-slate-300'
                        }`}
                        style={isSelected ? { borderColor: primaryColor, backgroundColor: `${primaryColor}08` } : {}}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <option.icon className={`w-4 h-4 ${isSelected ? '' : 'text-slate-400'}`} style={isSelected ? { color: primaryColor } : {}} />
                          <span className="font-medium text-slate-900">{option.label}</span>
                        </div>
                        <p className="text-xs text-slate-500">{option.description}</p>
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label className="text-slate-700">Service Instructions</Label>
                <Textarea
                  value={formData.service_instructions}
                  onChange={(e) => handleInputChange('service_instructions', e.target.value)}
                  placeholder="Any special instructions for the process server..."
                  rows={3}
                  className="rounded-xl resize-none"
                />
              </div>

              {/* Reference */}
              <div className="space-y-2">
                <Label className="text-slate-700">Your Reference Number</Label>
                <Input
                  value={formData.client_reference}
                  onChange={(e) => handleInputChange('client_reference', e.target.value)}
                  placeholder="Your internal reference or matter number"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pb-8">
            <Button variant="outline" onClick={() => navigate(`/portal/${companySlug}/orders`)} disabled={isSubmitting} className="rounded-xl px-6">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="text-white rounded-xl px-6" style={{ backgroundColor: primaryColor }}>
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
        </div>
      )}

      {/* Bulk Entry Tab */}
      {activeTab === 'bulk' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
              <Table className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Bulk Order Entry</h2>
              <p className="text-sm text-slate-500">Enter multiple orders using an easy form. Great for 2-20 orders.</p>
            </div>
          </div>
          <BulkOrderForm onSubmit={handleBulkSubmit} isSubmitting={isSubmitting} primaryColor={primaryColor} />
        </div>
      )}

      {/* CSV Upload Tab */}
      {activeTab === 'csv' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
              <Upload className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">CSV Upload</h2>
              <p className="text-sm text-slate-500">Upload a CSV file with multiple orders. Best for 10+ orders.</p>
            </div>
          </div>
          <CSVUploadForm onSubmit={handleBulkSubmit} isSubmitting={isSubmitting} primaryColor={primaryColor} />
        </div>
      )}
    </div>
  );
}
