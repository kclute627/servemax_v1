
import React, { useState, useCallback } from 'react';
import { UploadFile } from "@/api/integrations";
import { mergePDFs } from "@/api/functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Upload, 
  X, 
  FileText, 
  Image, 
  FileIcon,
  Loader2,
  PlusCircle,
  Combine,
  AlertTriangle
} from "lucide-react";

export default function DocumentUpload({ documents, onDocumentsChange }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [showMergeWarning, setShowMergeWarning] = useState(false);
  const [dontShowMergeWarning, setDontShowMergeWarning] = useState(
    localStorage.getItem('hideMergeWarning') === 'true'
  );

  const getDocumentCategory = (fileName, contentType) => {
    const name = fileName.toLowerCase();
    if (name.includes('summon') || name.includes('subpoena') || name.includes('complaint')) {
      return 'to_be_served';
    }
    if (name.includes('affidavit')) {
      return 'affidavit';
    }
    if (contentType.startsWith('image/')) {
      return 'photo';
    }
    return 'misc_attachment';
  };

  const getEstimatedPageCount = (fileSize, contentType) => {
    if (contentType === 'application/pdf') {
      return Math.max(1, Math.round(fileSize / 100000));
    }
    if (contentType.startsWith('image/')) {
      return 1;
    }
    return null;
  };

  const getPDFDocuments = useCallback(() => {
    return (documents || []).filter(doc => 
      doc.content_type === 'application/pdf' && doc.file_url
    );
  }, [documents]);

  const uploadFiles = useCallback(async (files) => {
    setIsUploading(true);
    
    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await UploadFile({ file });
        
        return {
          id: `upload-${Date.now()}-${Math.random()}`,
          title: file.name,
          affidavit_text: file.name, // Default affidavit text to filename
          file_url: file_url,
          file_size: file.size,
          content_type: file.type,
          document_category: getDocumentCategory(file.name, file.type),
          page_count: getEstimatedPageCount(file.size, file.type)
        };
      });

      const uploadedDocs = await Promise.all(uploadPromises);
      onDocumentsChange(prevDocs => [...(prevDocs || []), ...uploadedDocs]);
    } catch (error) {
      console.error("Error uploading files:", error);
    }
    
    setIsUploading(false);
  }, [onDocumentsChange]);

  const handleMergeClick = () => {
    if (dontShowMergeWarning) {
      performMerge();
    } else {
      setShowMergeWarning(true);
    }
  };

  const performMerge = useCallback(async () => {
    setIsMerging(true);
    setShowMergeWarning(false);

    try {
      const pdfDocs = getPDFDocuments();
      const fileUrls = pdfDocs.map(doc => doc.file_url);
      
      const response = await mergePDFs({
        file_urls: fileUrls,
        merged_title: 'Merged Service Documents'
      });

      // Create blob from response
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const file = new File([blob], 'Merged_Service_Documents.pdf', { type: 'application/pdf' });

      // Upload the merged file
      const { file_url } = await UploadFile({ file });

      // Create new document entry for merged PDF
      const mergedDoc = {
        id: `merged-${Date.now()}-${Math.random()}`,
        title: 'Merged Service Documents',
        affidavit_text: 'Merged Service Documents',
        file_url: file_url,
        file_size: blob.size,
        content_type: 'application/pdf',
        document_category: 'to_be_served',
        page_count: pdfDocs.reduce((total, doc) => total + (doc.page_count || 1), 0)
      };

      // Remove original PDF documents and add merged document
      const nonPdfDocs = (documents || []).filter(doc => 
        !(doc.content_type === 'application/pdf' && doc.file_url)
      );
      
      onDocumentsChange([...nonPdfDocs, mergedDoc]);

    } catch (error) {
      console.error("Error merging PDFs:", error);
      alert("Failed to merge PDFs. Please try again.");
    }

    setIsMerging(false);
  }, [documents, onDocumentsChange, getPDFDocuments]);

  const handleWarningConfirm = useCallback(() => {
    if (dontShowMergeWarning) {
      localStorage.setItem('hideMergeWarning', 'true');
    }
    performMerge();
  }, [dontShowMergeWarning, performMerge]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  }, [uploadFiles]);

  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    await uploadFiles(files);
    e.target.value = null; // Reset file input
  }, [uploadFiles]);

  const handleManualAdd = () => {
    const newDoc = {
      id: `manual-${Date.now()}-${Math.random()}`,
      title: "",
      affidavit_text: "",
      file_url: null,
      document_category: 'to_be_served',
    };
    onDocumentsChange([...(documents || []), newDoc]);
  };

  const handleDocumentChange = (index, field, value) => {
    const newDocuments = [...documents];
    const doc = newDocuments[index];

    // For manual entries, the affidavit text also serves as the title.
    if (!doc.file_url && field === 'affidavit_text') {
        doc['title'] = value;
        doc['affidavit_text'] = value;
    } else {
        doc[field] = value;
    }
    
    onDocumentsChange(newDocuments);
  };

  const removeDocument = (index) => {
    onDocumentsChange(documents.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (contentType) => {
    if (contentType === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    if (contentType?.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
    return <FileIcon className="w-5 h-5 text-slate-500" />;
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver 
            ? 'border-slate-400 bg-slate-50' 
            : 'border-slate-300 hover:border-slate-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="w-10 h-10 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600 font-medium mb-2">Drag & drop files or click to select</p>
        <input type="file" multiple onChange={handleFileSelect} className="hidden" id="file-upload" />
        <Button type="button" variant="outline" asChild disabled={isUploading}>
          <label htmlFor="file-upload" className="cursor-pointer">
            {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : 'Select Files'}
          </label>
        </Button>
      </div>

      <div className="flex justify-between items-center">
        <Button type="button" variant="outline" size="sm" onClick={handleManualAdd}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Add Manual Document Entry
        </Button>

        {getPDFDocuments().length > 1 && (
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleMergeClick}
            disabled={isMerging}
            className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            {isMerging ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Combine className="w-4 h-4" />
            )}
            {isMerging ? 'Merging...' : `Merge ${getPDFDocuments().length} PDFs`}
          </Button>
        )}
      </div>

      {(documents && documents.length > 0) && (
        <div className="space-y-4">
          <h4 className="font-medium text-slate-700">Documents to Serve ({documents.length})</h4>
          {documents.map((doc, index) => (
            <div key={doc.id || index} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getFileIcon(doc.content_type)}
                  <span className="font-semibold text-slate-800">
                    {doc.file_url ? 'Uploaded Document' : 'Manual Entry'}
                  </span>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeDocument(index)} className="text-slate-400 hover:text-red-600 h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div>
                <Label htmlFor={`affidavit-text-${index}`} className="text-xs font-semibold">Affidavit Text</Label>
                <Input 
                  id={`affidavit-text-${index}`} 
                  value={doc.affidavit_text} 
                  onChange={(e) => handleDocumentChange(index, 'affidavit_text', e.target.value)} 
                  placeholder={doc.file_url ? "Text for the affidavit (defaults to filename)" : "e.g., Summons, Complaint"}
                  required 
                />
                {doc.file_url && (
                  <p className="text-xs font-bold text-slate-600 mt-2">{doc.title}</p>
                )}
              </div>
              
              {doc.file_url && (
                <div className="flex items-center gap-4 text-xs text-slate-600 pt-2 border-t border-slate-200">
                  <span>Size: {formatFileSize(doc.file_size)}</span>
                  {doc.page_count && <span>Pages: ~{doc.page_count}</span>}
                  <span className="capitalize">{doc.content_type?.split('/')[1]}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showMergeWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Merge PDF Documents</h3>
                <p className="text-sm text-slate-600 mb-3">
                  This will combine all {getPDFDocuments().length} PDF documents into a single file. 
                  The original separate files will be removed.
                </p>
                <p className="text-sm text-slate-600">
                  Are you sure you want to merge these documents?
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox 
                id="dont-show-again"
                checked={dontShowMergeWarning}
                onCheckedChange={setDontShowMergeWarning}
              />
              <Label htmlFor="dont-show-again" className="text-sm text-slate-600">
                Don't show this message again
              </Label>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMergeWarning(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleWarningConfirm}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Yes, Merge PDFs
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
