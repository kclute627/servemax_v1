
import React, { useState, useCallback } from 'react';
import { UploadFile } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  X, 
  FileText, 
  Image, 
  FileIcon,
  Loader2,
  PlusCircle
} from "lucide-react";

export default function DocumentUpload({ documents, onDocumentsChange }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
      id: `manual-${Date.now()}`,
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

      <div className="flex justify-start">
        <Button type="button" variant="outline" size="sm" onClick={handleManualAdd}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Add Manual Document Entry
        </Button>
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
    </div>
  );
}
