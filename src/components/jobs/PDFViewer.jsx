import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select";
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Import the worker as a URL
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function PDFViewer({ documents, onClose, isOpen, width = 50, onWidthChange }) {
  const pdfDocuments = documents.filter(doc => doc.content_type === 'application/pdf' && doc.file_url);

  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !onWidthChange) return;

    const windowWidth = window.innerWidth;
    const newWidth = ((windowWidth - e.clientX) / windowWidth) * 100;

    // Constrain between 25% and 75%
    const constrainedWidth = Math.min(Math.max(newWidth, 25), 75);
    onWidthChange(constrainedWidth);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add/remove global mouse event listeners when dragging
  // IMPORTANT: This useEffect must be called before any conditional returns to follow React's Rules of Hooks
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging]);

  if (!isOpen || pdfDocuments.length === 0) {
    return null;
  }

  const currentDoc = pdfDocuments[selectedDocIndex];

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1); // Reset to first page when document loads
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 2.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  };

  return (
    <div
      className="fixed right-0 top-0 h-screen bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col"
      style={{ width: `${width}%` }}
    >
      {/* Resize Handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 bg-slate-300 hover:bg-blue-500 cursor-ew-resize transition-colors z-50"
        onMouseDown={handleMouseDown}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3 flex-1">
          <h3 className="font-semibold text-slate-900">PDF Viewer</h3>

          {/* Document Selector */}
          {pdfDocuments.length > 1 && (
            <select
              value={selectedDocIndex}
              onChange={(e) => {
                setSelectedDocIndex(Number(e.target.value));
                setPageNumber(1);
              }}
              className="flex h-9 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {pdfDocuments.map((doc, index) => (
                <option key={doc.id} value={index}>
                  {index === 0 ? '📄 Main Document' : doc.title || `Document ${index + 1}`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleZoomIn}
            disabled={scale >= 2.0}
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="ml-3"
          title="Close PDF viewer"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto bg-slate-100 p-4">
        <div className="flex justify-center">
          <Document
            file={currentDoc.file_url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center p-8">
                <div className="text-slate-600">Loading PDF...</div>
              </div>
            }
            error={
              <div className="flex items-center justify-center p-8">
                <div className="text-red-600">Failed to load PDF</div>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg"
            />
          </Document>
        </div>
      </div>

      {/* Page Navigation */}
      {numPages && numPages > 1 && (
        <div className="flex items-center justify-center gap-3 p-3 border-t border-slate-200 bg-slate-50">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-700">
            Page {pageNumber} of {numPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
