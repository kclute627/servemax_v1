
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { PDFDocument } from 'pdf-lib';
import { UploadFile } from "@/api/integrations";
import { FirebaseStorage } from "@/firebase/storage";
import { mergePDFs, extractDocumentAI, extractDocumentClaudeVision, extractDocumentClaudeHaiku } from "@/api/functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  X,
  FileText,
  Image,
  FileIcon,
  Loader2,
  PlusCircle,
  Combine,
  AlertTriangle,
  GripVertical,
  ExternalLink,
  Sparkles,
  Check
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function DocumentUpload({ documents, onDocumentsChange, onExtractedData }) {
  const { toast } = useToast();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState({}); // Track which docs are uploading: { docId: percentage }
  const [isMerging, setIsMerging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExtractingClaude, setIsExtractingClaude] = useState(false);
  const [isExtractingHaiku, setIsExtractingHaiku] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [extractedFirstPage, setExtractedFirstPage] = useState(null);
  const [backgroundExtraction, setBackgroundExtraction] = useState({
    status: 'idle', // idle | processing | completed | failed
    data: null,
    error: null
  });
  const [showMergeWarning, setShowMergeWarning] = useState(false);
  const [dontShowMergeWarning, setDontShowMergeWarning] = useState(
    localStorage.getItem('hideMergeWarning') === 'true'
  );
  const [isDragging, setIsDragging] = useState(false);
  const extractedPageObjectUrlRef = useRef(null);
  const backgroundExtractionPromiseRef = useRef(null);

  // Cleanup: ensure body overflow is reset on unmount and revoke object URLs
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      // Revoke object URL to prevent memory leaks
      if (extractedPageObjectUrlRef.current) {
        URL.revokeObjectURL(extractedPageObjectUrlRef.current);
      }
    };
  }, []);

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

  const getActualPageCount = async (file) => {
    try {
      if (file.type !== 'application/pdf') {
        return file.type.startsWith('image/') ? 1 : null;
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      return pdfDoc.getPageCount();
    } catch (error) {
      // Fallback to estimation
      return getEstimatedPageCount(file.size, file.type);
    }
  };

  const getPDFDocuments = useCallback(() => {
    return (documents || []).filter(doc => 
      doc.content_type === 'application/pdf' && doc.file_url
    );
  }, [documents]);

  const uploadFiles = useCallback(async (files) => {
    setIsUploading(true);

    try {
      // Map to track File objects by doc ID for later processing
      const fileMap = new Map();

      // Create document objects immediately and add to list (INSTANT feedback!)
      const newDocs = files.map((file, index) => {
        const docId = `upload-${Date.now()}-${index}-${Math.random()}`;

        // Store File object for later processing
        fileMap.set(docId, file);

        return {
          id: docId,
          title: file.name,
          affidavit_text: file.name,
          file_url: null, // Will be set when upload completes
          file_size: file.size,
          content_type: file.type,
          document_category: 'to_be_served',
          page_count: null,
          uploading: true // Mark as uploading
        };
      });

      // Add documents to list immediately (user sees them right away!)
      onDocumentsChange(prevDocs => [...(prevDocs || []), ...newDocs]);

      // Start uploads in background (non-blocking) - using map to track promises
      const uploadPromises = files.map((file, index) => {
        const docId = newDocs[index].id;

        // Initialize upload progress
        setUploadingDocs(prev => ({ ...prev, [docId]: 0 }));

        // Upload file with progress tracking
        return FirebaseStorage.uploadFileWithProgress(
          file,
          '', // default path
          (progress) => {
            // Update progress for this specific document
            setUploadingDocs(prev => ({ ...prev, [docId]: Math.round(progress) }));
          }
        )
        .then(result => {
          // Upload complete! Update document with URL
          // Update the document with URL
          onDocumentsChange(prevDocs =>
            prevDocs.map(doc =>
              doc.id === docId
                ? { ...doc, file_url: result.url, uploading: false }
                : doc
            )
          );

          // Clear uploading progress
          setUploadingDocs(prev => {
            const newProgress = { ...prev };
            delete newProgress[docId];
            return newProgress;
          });

          // For first PDF document, trigger extraction + page count
          if (index === 0 && file.type === 'application/pdf') {
            const firstFile = fileMap.get(docId);

            if (firstFile) {
              // Extract first page AND get page count from same PDF load
              prepareFirstPageForExtraction(firstFile)
                .then(extractResult => {
                  if (extractResult && extractResult.pageCount) {
                    // Update document with page count
                    onDocumentsChange(prevDocs =>
                      prevDocs.map(doc =>
                        doc.id === docId
                          ? { ...doc, page_count: extractResult.pageCount }
                          : doc
                      )
                    );
                  }
                })
                .catch(error => {
                  // Error extracting first page
                });
            }
          }
          // For non-first PDFs or non-PDFs, calculate page count separately
          else if (index > 0 || file.type !== 'application/pdf') {
            getActualPageCount(file).then(pageCount => {
              onDocumentsChange(prevDocs =>
                prevDocs.map(doc =>
                  doc.id === docId
                    ? { ...doc, page_count: pageCount }
                    : doc
                )
              );
            }).catch(error => {
              // Error calculating page count
            });
          }
        })
        .catch(error => {
          // Mark document as failed
          onDocumentsChange(prevDocs =>
            prevDocs.map(doc =>
              doc.id === docId
                ? { ...doc, uploading: false, uploadFailed: true }
                : doc
            )
          );

          // Clear uploading progress
          setUploadingDocs(prev => {
            const newProgress = { ...prev };
            delete newProgress[docId];
            return newProgress;
          });

          toast({
            variant: "destructive",
            title: "Upload failed",
            description: `Failed to upload ${file.name}. Please try again.`,
          });
        });
      });

      // Wait for all uploads to complete (or fail) - don't block UI
      Promise.allSettled(uploadPromises);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload files. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
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

      // Call the Firebase Cloud Function
      const response = await mergePDFs({
        file_urls: fileUrls,
        merged_title: 'Merged_Service_Documents'
      });

      // Response format: { success: boolean, url: string, pageCount: number }
      if (!response.success || !response.url) {
        throw new Error(response.message || 'Failed to merge PDFs');
      }

      // Concatenate all affidavit texts from merged documents
      const mergedAffidavitText = pdfDocs
        .map((doc, index) => `${doc.affidavit_text || doc.title || `Document ${index + 1}`}`)
        .join('; ');

      // Create new document entry for merged PDF
      const mergedDoc = {
        id: `merged-${Date.now()}-${Math.random()}`,
        title: 'Merged Service Documents',
        affidavit_text: mergedAffidavitText,
        file_url: response.url,
        file_size: null, // Not available from backend
        content_type: 'application/pdf',
        document_category: 'to_be_served',
        page_count: response.pageCount || pdfDocs.reduce((total, doc) => total + (doc.page_count || 1), 0)
      };

      // Remove original PDF documents and add merged document
      const nonPdfDocs = (documents || []).filter(doc =>
        !(doc.content_type === 'application/pdf' && doc.file_url)
      );

      onDocumentsChange([...nonPdfDocs, mergedDoc]);

    } catch (error) {
      alert(`Failed to merge PDFs: ${error.message || 'Unknown error'}. Please try again.`);
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

  // Pre-extract first page of the main document for faster AI processing
  // Simplified: Only accepts File objects, no abort logic, no URL downloads
  const prepareFirstPageForExtraction = async (file) => {
    try {
      setIsPreparing(true);
      setExtractedFirstPage(null);
      setBackgroundExtraction({ status: 'idle', data: null, error: null });
      backgroundExtractionPromiseRef.current = null;

      // Load PDF from File object (no download needed)
      const pdfBytes = await file.arrayBuffer();

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const totalPages = pdfDoc.getPageCount();

      // Create a new PDF with ONLY the first page
      const extractedPdf = await PDFDocument.create();
      const [firstPage] = await extractedPdf.copyPages(pdfDoc, [0]);
      extractedPdf.addPage(firstPage);

      const firstPageBytes = await extractedPdf.save();

      // Convert to base64 for sending to Cloud Function
      const base64 = btoa(
        new Uint8Array(firstPageBytes).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      setExtractedFirstPage(base64);

      // Create object URL for debugging
      if (extractedPageObjectUrlRef.current) {
        URL.revokeObjectURL(extractedPageObjectUrlRef.current);
      }
      const blob = new Blob([firstPageBytes], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);
      extractedPageObjectUrlRef.current = objectUrl;

      // Return both extracted page and page count
      const result = { extractedFirstPage: base64, pageCount: totalPages };
      return result;
    } catch (error) {
      setExtractedFirstPage(null);
      return { extractedFirstPage: null, pageCount: null };
    } finally {
      setIsPreparing(false);
    }
  };

  // Note: Removed useEffect that watched documents[0]?.file_url to prevent race conditions.
  // Extraction now only happens from the upload handler.

  // SILENT background extraction with Claude Haiku when first page is ready
  // User doesn't know this is happening - it's for speed optimization
  useEffect(() => {
    const startBackgroundExtraction = async () => {
      if (!extractedFirstPage) {
        return;
      }
  
      // Prevent duplicate calls
      if (backgroundExtraction.status !== 'idle') {
        return;
      }
  
      // Clear any existing promise before starting new one
      if (backgroundExtractionPromiseRef.current) {
        backgroundExtractionPromiseRef.current = null;
      }
  
      setBackgroundExtraction({ status: 'processing', data: null, error: null });
  
      // Capture current first page to prevent stale data
      const currentFirstPage = extractedFirstPage;
  
      const extractionPromise = extractDocumentClaudeHaiku({
        first_page_base64: currentFirstPage
      });
      backgroundExtractionPromiseRef.current = extractionPromise;
  
      try {
        const result = await extractionPromise;
  
        // Verify we're still on the same page
        if (extractedFirstPage !== currentFirstPage) {
          return;
        }
  
        if (result.success && result.extractedData) {
          setBackgroundExtraction({ status: 'completed', data: result.extractedData, error: null });
        } else {
          throw new Error('No data extracted');
        }
      } catch (error) {
        // Only update if still on same page
        if (extractedFirstPage === currentFirstPage) {
          setBackgroundExtraction({ status: 'failed', data: null, error: error.message });
        }
      } finally {
        if (backgroundExtractionPromiseRef.current === extractionPromise) {
          backgroundExtractionPromiseRef.current = null;
        }
      }
    };
  
    startBackgroundExtraction();
  }, [extractedFirstPage]);

  // Extract case information from the main document using Google Document AI
  const handleExtractWithAI = async (documentUrl, documentIndex) => {
    try {
      setIsExtracting(true);

      toast({
        title: "Extracting document data",
        description: "Processing with Document AI...",
      });

      // Call Google Document AI Cloud Function
      // Use pre-extracted first 3 pages if available (much faster!)
      const result = extractedFirstPage
        ? await extractDocumentAI({ first_page_base64: extractedFirstPage })
        : await extractDocumentAI({ file_url: documentUrl });

      if (result.success && result.extractedData) {
        // Pass extracted data to parent component (CreateJob)
        if (onExtractedData) {
          onExtractedData(result.extractedData);
        }

        toast({
          variant: "success",
          title: "Document AI extraction complete",
          description: `Extracted ${Object.keys(result.extractedData).length} fields`,
        });
      } else {
        throw new Error('No data extracted from document');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Document AI extraction failed",
        description: error.message || "Failed to extract document data. Please try again.",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  // Helper: Check if all critical fields are present in extracted data
  const hasAllKeyFields = (data) => {
    if (!data) return false;
    return !!(data.caseNumber && data.plaintiff && data.defendant && data.full_court_name);
  };

  // Helper: Extract remaining pages when first page is missing key fields
  const extractRemainingPages = async (documentUrl) => {
    try {
      // Extract from full document (fallback to file_url)
      const result = await extractDocumentClaudeVision({ file_url: documentUrl });

      if (result.success && result.extractedData) {
        return result.extractedData;
      }

      throw new Error('Failed to extract from remaining pages');
    } catch (error) {
      throw error;
    }
  };

  // Extract case information from the main document using Claude Vision (Sonnet)
  // Uses progressive extraction: page 1 first (fast), then expand if needed
  const handleExtractWithClaudeVision = async (documentUrl, documentIndex) => {
    try {
      // Guard: Don't re-extract if already in progress
      if (isExtractingClaude) {
        return;
      }

      // Show spinner immediately when user clicks
      setIsExtractingClaude(true);

      let extractedData = null;

      // Case 1: Background extraction already completed
      if (backgroundExtraction.status === 'completed' && backgroundExtraction.data) {
        extractedData = backgroundExtraction.data;
      }

      // Case 2: Background extraction still running - wait for it
      else if (backgroundExtraction.status === 'processing' && backgroundExtractionPromiseRef.current) {
        const result = await backgroundExtractionPromiseRef.current;

        if (result.success && result.extractedData) {
          extractedData = result.extractedData;
        } else {
          throw new Error('Page 1 extraction failed');
        }
      }

      // Case 3: Background extraction not available
      else {
        throw new Error('Background extraction not ready. Please wait a moment and try again.');
      }

      // Now check if we have all key fields
      if (hasAllKeyFields(extractedData)) {
        // Pass extracted data to parent component (CreateJob)
        if (onExtractedData) {
          onExtractedData(extractedData);
        }

        toast({
          variant: "success",
          title: "Claude Sonnet extraction complete",
          description: `Extracted ${Object.keys(extractedData).length} fields (page 1 only)`,
        });

        setIsExtractingClaude(false);
        return;
      }

      // Key fields missing - expand search to full document
      const expandedData = await extractRemainingPages(documentUrl);

      // Merge page 1 with expanded data (expanded data takes priority)
      const mergedData = { ...extractedData, ...expandedData };

      // Pass merged data to parent component
      if (onExtractedData) {
        onExtractedData(mergedData);
      }

      toast({
        variant: "success",
        title: "Claude Sonnet extraction complete",
        description: `Extracted ${Object.keys(mergedData).length} fields (full document)`,
      });

      setIsExtractingClaude(false);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Claude Sonnet extraction failed",
        description: error.message || "Failed to extract document data. Please try another method.",
      });
      setIsExtractingClaude(false);
    }
  };

  // Extract case information from the main document using Claude Haiku (Fast & Cheap)
const handleExtractWithHaiku = async (documentUrl, documentIndex) => {
  // Guard: Prevent multiple clicks
  if (isExtractingHaiku) {
    return;
  }

  try {
    setIsExtractingHaiku(true);

    let extractedData = null;
    let usedCache = false;

    // Case 1: Background extraction already completed - use cached result
    if (backgroundExtraction.status === 'completed' && backgroundExtraction.data) {
      extractedData = backgroundExtraction.data;
      usedCache = true;
    }
    // Case 2: Background extraction still running - wait for it
    else if (backgroundExtraction.status === 'processing' && backgroundExtractionPromiseRef.current) {
      // Show toast only if we're waiting
      toast({
        title: "Extracting document data",
        description: "Processing with Claude Haiku (fast & cheap)...",
      });
      
      const result = await backgroundExtractionPromiseRef.current;
      
      if (result.success && result.extractedData) {
        extractedData = result.extractedData;
      } else {
        throw new Error('Background extraction failed');
      }
    }
    // Case 3: Background extraction not available - do direct extraction
    else {
      // Show toast only if we're doing direct extraction
      toast({
        title: "Extracting document data",
        description: "Processing with Claude Haiku (fast & cheap)...",
      });
      
      const result = extractedFirstPage
        ? await extractDocumentClaudeHaiku({ first_page_base64: extractedFirstPage })
        : await extractDocumentClaudeHaiku({ file_url: documentUrl });
      
      if (result.success && result.extractedData) {
        extractedData = result.extractedData;
      } else {
        throw new Error('No data extracted from document');
      }
    }

    if (extractedData) {
      // Pass extracted data to parent component (CreateJob)
      if (onExtractedData) {
        onExtractedData(extractedData);
      }

      // Only show success toast if we actually did extraction (not cached)
      if (!usedCache) {
        toast({
          variant: "success",
          title: "Extraction complete",
          description: `Extracted ${Object.keys(extractedData).length} fields`,
        });
      }
    } else {
      throw new Error('No data extracted from document');
    }
  } catch (error) {
    toast({
      variant: "destructive",
      title: "Extraction failed",
      description: error.message || "Failed to extract document data. Please try again.",
    });
  } finally {
    setIsExtractingHaiku(false);
  }
};

  const handleDragStart = () => {
    setIsDragging(true);
    // Prevent body scroll during drag
    document.body.style.overflow = 'hidden';
  };

  const handleDragEnd = (result) => {
    setIsDragging(false);
    // Re-enable body scroll
    document.body.style.overflow = '';

    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    const reorderedDocs = Array.from(documents);
    const [removed] = reorderedDocs.splice(result.source.index, 1);
    reorderedDocs.splice(result.destination.index, 0, removed);

    onDocumentsChange(reorderedDocs);
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
    <div className={`space-y-4 ${isDragging ? 'dragging-active' : ''}`}>
      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .document-card-enter {
          animation: fadeSlideIn 0.3s ease-out forwards;
        }

        .document-dragging {
          opacity: 0.5;
          transform: rotate(2deg);
        }

        /* Prevent text selection during drag */
        .dragging-active {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }

        /* Fix for drag positioning */
        [data-rbd-drag-handle-context-id] {
          cursor: grab !important;
        }

        [data-rbd-drag-handle-context-id]:active {
          cursor: grabbing !important;
        }
      `}</style>

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
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-slate-700">Documents to Serve ({documents.length})</h4>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <GripVertical className="w-3 h-3" />
              Drag to reorder
            </p>
          </div>
          <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <Droppable droppableId="documents-list" direction="horizontal">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex flex-wrap gap-3"
                  style={{
                    minHeight: isDragging ? '200px' : 'auto'
                  }}
                >
                  {documents.map((doc, index) => (
                    <Draggable key={doc.id || index} draggableId={doc.id || `doc-${index}`} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`p-3 rounded-lg border space-y-2 transition-all ${!snapshot.isDragging ? 'document-card-enter' : ''} ${
                            snapshot.isDragging
                              ? 'bg-white border-blue-400 shadow-2xl border-2 rotate-2 scale-105 w-full md:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]'
                              : index === 0
                              ? 'bg-blue-50 border-blue-300 border-2 w-full'
                              : 'bg-slate-50 border-slate-200 w-full md:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]'
                          }`}
                          style={{
                            ...(!snapshot.isDragging && { animationDelay: `${index * 50}ms` }),
                            ...provided.draggableProps.style
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab active:cursor-grabbing hover:bg-slate-200 rounded p-1 -ml-1 transition-colors"
                                title="Drag to reorder"
                              >
                                <GripVertical className="w-4 h-4 text-slate-500" />
                              </div>
                              {getFileIcon(doc.content_type)}
                              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-medium text-sm text-slate-800 truncate">
                                    {doc.uploading
                                      ? `Uploading... ${uploadingDocs[doc.id] || 0}%`
                                      : doc.file_url ? 'Uploaded' : 'Manual'
                                    }
                                  </span>
                                  {index === 0 && (
                                    <Badge className="bg-blue-600 text-white text-xs px-1.5 py-0">Main</Badge>
                                  )}

                                  {/* AI Extraction Buttons for Main Document */}
                                  {index === 0 && doc.content_type === 'application/pdf' && doc.file_url && (
                                    <>
                                      {/* Document AI Button */}
                                      {/* <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-5 px-1.5 gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                                        onClick={() => handleExtractWithAI(doc.file_url, index)}
                                        disabled={isExtracting}
                                        title={
                                          isExtracting
                                            ? "Extracting with Document AI..."
                                            : "Extract with Document AI"
                                        }
                                      >
                                        {isExtracting ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Sparkles className="w-3 h-3" />
                                        )}
                                        <span className="text-xs">
                                          {isExtracting ? 'Extracting...' : 'Doc AI'}
                                        </span>
                                      </Button> */}

                                      {/* Claude Vision (Sonnet) Button */}
                                      {/* <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-5 px-1.5 gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                                        onClick={() => handleExtractWithClaudeVision(doc.file_url, index)}
                                        disabled={isExtractingClaude}
                                        title={
                                          isExtractingClaude
                                            ? "Extracting with Claude Sonnet..."
                                            : "Extract with Claude Sonnet"
                                        }
                                      >
                                        {isExtractingClaude ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Sparkles className="w-3 h-3" />
                                        )}
                                        <span className="text-xs">
                                          {isExtractingClaude ? 'Extracting...' : 'Sonnet'}
                                        </span>
                                      </Button> */}

                                      {/* Claude Haiku Button */}
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-5 px-1.5 gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                                        onClick={() => handleExtractWithHaiku(doc.file_url, index)}
                                        disabled={isExtractingHaiku}
                                        title={
                                          isExtractingHaiku
                                            ? "Extracting with Claude Haiku..."
                                            : "Extract with Claude Haiku (fast & cheap!)"
                                        }
                                      >
                                        {isExtractingHaiku ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Sparkles className="w-3 h-3" />
                                        )}
                                        <span className="text-xs">
                                          {isExtractingHaiku ? 'Extracting...' : 'Extract Data'}
                                        </span>
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeDocument(index)} className="text-slate-400 hover:text-red-600 h-6 w-6 flex-shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          <div>
                            <Label htmlFor={`affidavit-text-${index}`} className="text-xs font-medium mb-1">Affidavit Text</Label>
                            <Input
                              id={`affidavit-text-${index}`}
                              value={doc.affidavit_text}
                              onChange={(e) => handleDocumentChange(index, 'affidavit_text', e.target.value)}
                              placeholder={doc.file_url ? "Text for affidavit" : "e.g., Summons"}
                              className="text-sm h-8"
                              required
                            />
                            {!doc.uploading && doc.file_url && (
                              <p className="text-xs text-slate-600 mt-1 truncate" title={doc.title}>{doc.title}</p>
                            )}
                            {doc.uploading && (
                              <p className="text-xs text-blue-600 mt-1 truncate" title={doc.title}>{doc.title}</p>
                            )}
                          </div>

                          {/* Upload Progress Bar */}
                          {doc.uploading && uploadingDocs[doc.id] !== undefined && (
                            <div className="space-y-1 pb-2">
                              <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                                  style={{ width: `${uploadingDocs[doc.id]}%` }}
                                />
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <span>{formatFileSize(doc.file_size)}</span>
                              </div>
                            </div>
                          )}

                          {/* File metadata after upload complete */}
                          {!doc.uploading && doc.file_url && (
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                              <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                                <span>{formatFileSize(doc.file_size)}</span>
                                {doc.page_count && <span>• {doc.page_count}pg</span>}
                              </div>
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                              >
                                View
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
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
