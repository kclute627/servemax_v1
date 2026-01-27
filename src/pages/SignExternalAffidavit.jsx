import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Job, Document, User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Save, Check, X, PenTool, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UploadFile } from '@/api/integrations';
import { useGlobalData } from '@/components/GlobalDataContext';
import { format } from 'date-fns';
import { Document as PDFDocument, Page, pdfjs } from 'react-pdf';

// Import worker directly from node_modules (Vite compatible - avoids CORS issues)
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker with local file
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Draggable and Resizable Signature Component for PDF signing
 */
function DraggableSignature({ signatureData, position, size, onPositionChange, onSizeChange, onRemove, containerRef }) {
  const signatureRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.target.classList.contains('resize-handle')) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = signatureRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      width: size.width,
      height: size.height,
      x: e.clientX,
      y: e.clientY
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        let newX = e.clientX - containerRect.left - dragOffset.x;
        let newY = e.clientY - containerRect.top - dragOffset.y;

        // Constrain within container
        newX = Math.max(0, Math.min(newX, containerRect.width - size.width));
        newY = Math.max(0, Math.min(newY, containerRect.height - size.height));

        onPositionChange({ x: newX, y: newY });
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const aspectRatio = resizeStart.width / resizeStart.height;

        let newWidth = Math.max(80, Math.min(300, resizeStart.width + deltaX));
        let newHeight = newWidth / aspectRatio;

        onSizeChange({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, resizeStart, size, containerRef, onPositionChange, onSizeChange]);

  return (
    <div
      ref={signatureRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        border: '2px dashed #3B82F6',
        borderRadius: '4px',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        zIndex: 10,
        userSelect: 'none'
      }}
    >
      <img
        src={signatureData}
        alt="Signature"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: 'none'
        }}
        draggable="false"
      />

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#EF4444',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          zIndex: 11
        }}
      >
        <X size={12} />
      </button>

      {/* Resize handle */}
      <div
        className="resize-handle"
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute',
          bottom: '-5px',
          right: '-5px',
          width: '14px',
          height: '14px',
          backgroundColor: '#3B82F6',
          borderRadius: '2px',
          cursor: 'se-resize',
          zIndex: 11
        }}
      />
    </div>
  );
}

/**
 * Draggable Date Component for PDF signing
 */
function DraggableDate({ dateText, position, size, onPositionChange, onSizeChange, onRemove, containerRef }) {
  const dateRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, x: 0 });

  const handleMouseDown = (e) => {
    if (e.target.classList.contains('resize-handle')) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = dateRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      width: size.width,
      x: e.clientX
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        let newX = e.clientX - containerRect.left - dragOffset.x;
        let newY = e.clientY - containerRect.top - dragOffset.y;

        // Constrain within container
        newX = Math.max(0, Math.min(newX, containerRect.width - size.width));
        newY = Math.max(0, Math.min(newY, containerRect.height - size.height));

        onPositionChange({ x: newX, y: newY });
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        let newWidth = Math.max(80, Math.min(200, resizeStart.width + deltaX));
        // Height scales with font size, roughly width/4
        let newHeight = Math.max(20, newWidth / 4);
        onSizeChange({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, resizeStart, size, containerRef, onPositionChange, onSizeChange]);

  // Calculate font size based on height
  const fontSize = Math.max(12, size.height * 0.7);

  return (
    <div
      ref={dateRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        border: '2px dashed #10B981',
        borderRadius: '4px',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        zIndex: 10,
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'serif',
        fontSize: `${fontSize}px`,
        color: '#000'
      }}
    >
      {dateText}

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#EF4444',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          zIndex: 11
        }}
      >
        <X size={12} />
      </button>

      {/* Resize handle */}
      <div
        className="resize-handle"
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute',
          bottom: '-5px',
          right: '-5px',
          width: '14px',
          height: '14px',
          backgroundColor: '#10B981',
          borderRadius: '2px',
          cursor: 'se-resize',
          zIndex: 11
        }}
      />
    </div>
  );
}

export default function SignExternalAffidavit() {
  const { refreshData } = useGlobalData();
  const navigate = useNavigate();
  const location = useLocation();

  const [job, setJob] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [existingDocId, setExistingDocId] = useState(null);

  // PDF state
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [renderedPageDimensions, setRenderedPageDimensions] = useState({ width: 612, height: 792 });

  // Signature state
  const [signaturePosition, setSignaturePosition] = useState({ x: 200, y: 600 });
  const [signatureSize, setSignatureSize] = useState({ width: 280, height: 80 });
  const [placedSignature, setPlacedSignature] = useState(null);
  const [signaturePage, setSignaturePage] = useState(1);
  const [isAlreadySigned, setIsAlreadySigned] = useState(false); // For documents that are already signed

  // Date stamp state
  const [datePosition, setDatePosition] = useState({ x: 350, y: 650 });
  const [dateSize, setDateSize] = useState({ width: 120, height: 30 });
  const [placedDate, setPlacedDate] = useState(null);
  const [datePage, setDatePage] = useState(1);

  const containerRef = useRef(null);
  const pageContainerRef = useRef(null);

  // Parse query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const jobId = params.get('jobId');
    const fileUrl = params.get('fileUrl');
    const docId = params.get('docId');

    if (fileUrl) {
      setPdfUrl(decodeURIComponent(fileUrl));
    }

    if (jobId) {
      loadJob(jobId);
    }

    // Store docId for updating existing shared document
    if (docId) {
      setExistingDocId(docId);
    }

    loadUser();
  }, [location.search]);

  const loadJob = async (jobId) => {
    try {
      const jobData = await Job.findById(jobId);
      setJob(jobData);
    } catch (e) {
      console.error("Failed to load job:", e);
      setError(e.message);
    }
  };

  const loadUser = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
    } catch (e) {
      console.error("Failed to load user:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setSignaturePage(numPages); // Default signature to last page
    setCurrentPage(numPages);
  };

  const handleSignaturePlace = () => {
    if (!user?.e_signature?.signature_data) {
      alert('No signature found. Please create a signature in Settings > My Settings first.');
      return;
    }

    setPlacedSignature({
      signature_data: user.e_signature.signature_data,
      signed_date: new Date().toISOString(),
      signer_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      position: signaturePosition,
      size: signatureSize,
      page: currentPage
    });
    setSignaturePage(currentPage);
  };

  const handleSignatureRemove = () => {
    setPlacedSignature(null);
  };

  const handlePositionChange = (newPosition) => {
    setSignaturePosition(newPosition);
    if (placedSignature) {
      setPlacedSignature({
        ...placedSignature,
        position: newPosition
      });
    }
  };

  const handleSizeChange = (newSize) => {
    setSignatureSize(newSize);
    if (placedSignature) {
      setPlacedSignature({
        ...placedSignature,
        size: newSize
      });
    }
  };

  // Date handlers
  const handleDatePlace = () => {
    const dateText = format(new Date(), 'MM/dd/yyyy');
    setPlacedDate({
      date_text: dateText,
      position: datePosition,
      size: dateSize,
      page: currentPage
    });
    setDatePage(currentPage);
  };

  const handleDateRemove = () => {
    setPlacedDate(null);
  };

  const handleDatePositionChange = (newPosition) => {
    setDatePosition(newPosition);
    if (placedDate) {
      setPlacedDate({
        ...placedDate,
        position: newPosition
      });
    }
  };

  const handleDateSizeChange = (newSize) => {
    setDateSize(newSize);
    if (placedDate) {
      setPlacedDate({
        ...placedDate,
        size: newSize
      });
    }
  };

  const handleSave = async () => {
    if (!placedSignature && !placedDate && !isAlreadySigned) {
      alert('Please place your signature, add a date, or check "Already Signed" before saving.');
      return;
    }

    setIsSaving(true);
    try {
      let finalUrl = pdfUrl;
      let signaturePageNum = null;

      // If user placed a signature or date, embed them in the PDF
      if (placedSignature || placedDate) {
        // Import signExternalPDF function
        const { signExternalPDF } = await import('@/api/functions');

        // Call Cloud Function to embed signature and/or date in PDF
        const response = await signExternalPDF({
          pdfUrl: pdfUrl,
          // Signature data (optional)
          signatureData: placedSignature?.signature_data || null,
          position: placedSignature?.position || null,
          size: placedSignature?.size || null,
          page: placedSignature?.page || null,
          // Date data (optional)
          dateData: placedDate ? {
            text: placedDate.date_text,
            position: placedDate.position,
            size: placedDate.size,
            page: placedDate.page
          } : null,
          // Rendered dimensions for coordinate conversion
          renderedWidth: renderedPageDimensions.width,
          renderedHeight: renderedPageDimensions.height
        });

        if (!response.success || !response.url) {
          throw new Error(response.message || 'Failed to sign PDF');
        }

        finalUrl = response.url;
        signaturePageNum = placedSignature?.page || placedDate?.page;
      }

      // If we have an existing doc ID (shared from partner), update it instead of creating new
      if (existingDocId) {
        await Document.update(existingDocId, {
          file_url: finalUrl,
          is_signed: true,
          signed_at: new Date().toISOString(),
          title: `Signed Affidavit - ${format(new Date(), 'MMM d, yyyy')}`,
          metadata: {
            source: 'partner_signed',
            original_url: pdfUrl,
            ...(signaturePageNum && { signature_page: signaturePageNum })
          }
        });
        console.log('[SignExternal] Existing shared document updated:', existingDocId);
      } else {
        // Create new Document record
        const newDocument = await Document.create({
          company_id: job.company_id,
          job_id: job.id,
          title: `${isAlreadySigned && !placedSignature ? 'External' : 'Signed External'} Affidavit - ${format(new Date(), 'MMM d, yyyy')}`,
          file_url: finalUrl,
          document_category: 'affidavit',
          content_type: 'application/pdf',
          page_count: numPages,
          is_signed: true,
          signed_at: new Date().toISOString(),
          received_at: new Date().toISOString(),
          metadata: {
            source: 'external_upload',
            original_url: pdfUrl,
            ...(signaturePageNum && { signature_page: signaturePageNum }),
            already_signed: isAlreadySigned && !placedSignature && !placedDate
          }
        });
        console.log('[SignExternal] Document created:', newDocument);
      }

      // Update job flag
      await Job.update(job.id, {
        has_signed_affidavit: true
      });

      // Refresh global data
      refreshData();

      setSaveSuccess(true);

      // Navigate back to JobDetails
      setTimeout(() => {
        navigate(createPageUrl(`JobDetails?id=${job.id}&refresh=${Date.now()}`));
      }, 1000);

    } catch (error) {
      console.error("Error saving signed affidavit:", error);
      alert(`Failed to save: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const hasUserSignature = user?.e_signature?.signature_data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-200 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to={createPageUrl("Jobs")}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Jobs
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="min-h-screen bg-slate-200 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">No PDF file specified.</p>
          <Link to={job ? createPageUrl(`JobDetails?id=${job.id}`) : createPageUrl("Jobs")}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-slate-100 border-b border-slate-300 p-4 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to={job ? createPageUrl(`JobDetails?id=${job.id}`) : createPageUrl('Jobs')}>
                <Button variant="outline" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Upload Affidavit</h1>
                {job && <p className="text-sm text-slate-600">Job #{job.job_number}</p>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Signed Badge */}
              {placedSignature && (
                <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 gap-1">
                  <PenTool className="w-3 h-3" />
                  Signed
                </Badge>
              )}

              {/* Date Badge */}
              {placedDate && (
                <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 gap-1">
                  <Calendar className="w-3 h-3" />
                  {placedDate.date_text}
                </Badge>
              )}

              {/* Already Signed Badge */}
              {isAlreadySigned && !placedSignature && !placedDate && (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700 gap-1">
                  <Check className="w-3 h-3" />
                  Already Signed
                </Badge>
              )}

              {/* Remove Signature Button */}
              {placedSignature && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignatureRemove}
                  className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Remove Signature
                </Button>
              )}

              {/* Remove Date Button */}
              {placedDate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDateRemove}
                  className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Remove Date
                </Button>
              )}

              {/* Sign Button */}
              {hasUserSignature && !placedSignature && !isAlreadySigned && (
                <Button
                  onClick={handleSignaturePlace}
                  variant="outline"
                  className="gap-2"
                >
                  <PenTool className="w-4 h-4" />
                  Sign
                </Button>
              )}

              {/* Date Button */}
              {!placedDate && !isAlreadySigned && (
                <Button
                  onClick={handleDatePlace}
                  variant="outline"
                  className="gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Date
                </Button>
              )}

              {/* Already Signed Checkbox */}
              {!placedSignature && !placedDate && (
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAlreadySigned}
                    onChange={(e) => setIsAlreadySigned(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  Already Signed
                </label>
              )}

              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={(!placedSignature && !placedDate && !isAlreadySigned) || isSaving}
                variant={saveSuccess ? "default" : "outline"}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Affidavit
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Page Navigation */}
          {numPages && numPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-600">
                Page {currentPage} of {numPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* PDF Preview */}
      <div className="flex justify-center py-8" ref={containerRef}>
        <div
          ref={pageContainerRef}
          style={{ position: 'relative', backgroundColor: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
        >
          <PDFDocument
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            }
            error={
              <div className="p-8 text-center text-red-600">
                Failed to load PDF. Please check the file URL.
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              width={612}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onRenderSuccess={() => {
                // Get actual rendered dimensions from the DOM canvas
                // This is more reliable than react-pdf's page object which may return viewport dimensions
                if (pageContainerRef.current) {
                  const canvas = pageContainerRef.current.querySelector('canvas');
                  if (canvas) {
                    setRenderedPageDimensions({
                      width: canvas.offsetWidth,
                      height: canvas.offsetHeight
                    });
                  }
                }
              }}
            />
          </PDFDocument>

          {/* Signature overlay - only show on signature page */}
          {placedSignature && currentPage === signaturePage && (
            <DraggableSignature
              signatureData={placedSignature.signature_data}
              position={signaturePosition}
              size={signatureSize}
              onPositionChange={handlePositionChange}
              onSizeChange={handleSizeChange}
              onRemove={handleSignatureRemove}
              containerRef={pageContainerRef}
            />
          )}

          {/* Date overlay - only show on date page */}
          {placedDate && currentPage === datePage && (
            <DraggableDate
              dateText={placedDate.date_text}
              position={datePosition}
              size={dateSize}
              onPositionChange={handleDatePositionChange}
              onSizeChange={handleDateSizeChange}
              onRemove={handleDateRemove}
              containerRef={pageContainerRef}
            />
          )}

          {/* Sign button overlay */}
          {hasUserSignature && !placedSignature && (
            <div style={{
              position: 'absolute',
              bottom: '100px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10
            }}>
              <Button
                onClick={handleSignaturePlace}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              >
                <PenTool className="w-4 h-4" />
                Click to Sign Page {currentPage}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* No signature warning */}
      {!hasUserSignature && (
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <p className="text-amber-800">
              No signature found. Please{' '}
              <Link to={createPageUrl('Settings')} className="underline font-medium">
                create a signature in Settings
              </Link>
              {' '}first.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
