import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Code,
  Eye,
  Copy,
  FileCode,
  HelpCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { renderHTMLTemplate } from '@/utils/templateEngine';
import { getAvailablePlaceholders } from '@/utils/templateEngine';
import { getConstantsDocumentation } from '@/utils/templateConstants';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@/components/ui/tooltip';

const SAMPLE_DATA = {
  document_title: 'AFFIDAVIT OF SERVICE',
  server_name: 'John Smith',
  server_license_number: 'IL-12345',
  case_number: '2025-CH-001234',
  court_name: 'Circuit Court of Cook County',
  court_county: 'Cook County',
  court_state: 'IL',
  case_caption: 'Jane Doe v. John Doe',
  plaintiff: 'Jane Doe',
  defendant: 'John Doe',
  service_date: '2025-01-15',
  service_time: '2:30 PM',
  service_address: '123 Main St, Chicago, IL 60601',
  service_manner: 'personal',
  recipient_name: 'John Doe',
  person_served_name: 'John Doe',
  person_sex: 'Male',
  person_age: '42',
  person_height: '5\'10"',
  person_weight: '180 lbs',
  person_hair: 'Brown',
  person_relationship: 'Defendant',
  person_description_other: 'Wearing blue jeans and gray t-shirt',
  documents_served: [
    { title: 'Summons' },
    { title: 'Complaint for Divorce' },
    { title: 'Notice of Motion' }
  ],
  company_info: {
    company_name: 'ServeMax Process Serving',
    address1: '456 Service Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60602',
    phone: '(312) 555-0100'
  },
  attempts: [
    {
      attempt_date: '2025-01-12T09:30:00Z',
      status: 'not_served',
      address_of_attempt: '123 Main St, Chicago, IL 60601',
      notes: 'No answer at door.',
      service_type_detail: 'Personal Service Attempted',
    },
    {
      attempt_date: '2025-01-13T18:45:00Z',
      status: 'not_served',
      address_of_attempt: '123 Main St, Chicago, IL 60601',
      notes: 'Vehicle in driveway but no answer.',
      service_type_detail: 'Personal Service Attempted',
    },
    {
      attempt_date: '2025-01-15T14:30:00Z',
      status: 'served',
      address_of_attempt: '123 Main St, Chicago, IL 60601',
      person_served_name: 'John Doe',
      notes: 'Subject answered door and accepted service.',
      service_type_detail: 'Personal Service',
    }
  ],
};

function TemplateCodeEditor({ value, onChange, className }) {
  const [htmlCode, setHtmlCode] = useState(value || '');
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [showConstants, setShowConstants] = useState(false);
  const [isPaneCollapsed, setIsPaneCollapsed] = useState(false);
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false);
  const [editorWidth, setEditorWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [pages, setPages] = useState([]);

  const editorRef = useRef(null);
  const debounceTimeout = useRef(null);
  const previewContainerRef = useRef(null);
  const containerRef = useRef(null);
  const pageRefs = useRef({});

  // // Calculate exact page count based on actual rendered content
  // const getPageCount = (htmlContent) => {
  //   if (!htmlContent) return 0;
  //   try {
  //     const temp = document.createElement('div');
  //     temp.style.position = 'absolute';
  //     temp.style.left = '-9999px';
  //     temp.style.visibility = 'hidden';
  //     temp.innerHTML = htmlContent;
  //     document.body.appendChild(temp);
      
  //     const height = temp.scrollHeight;
  //     const pageHeight = 792; // Letter height in points
  //     const numPages = Math.ceil(height / pageHeight);
      
  //     document.body.removeChild(temp);
  //     return Math.max(1, numPages);
  //   } catch (error) {
  //     return 1;
  //   }
  // };

  const getPageCount = (htmlContent) => {
    if (!htmlContent) return 0;
    try {
      const temp = document.createElement('div');
      temp.style.position = 'absolute';
      temp.style.left = '-9999px';
      temp.style.visibility = 'hidden';
      temp.style.width = '816px'; // Match the preview page width
      temp.innerHTML = htmlContent;
      document.body.appendChild(temp);
      
      const height = temp.scrollHeight;
      const pageHeight = 1056; // Letter height in pixels (not points)
      const numPages = Math.ceil(height / pageHeight);
      
      document.body.removeChild(temp);
      return Math.max(1, numPages);
    } catch (error) {
      return 1;
    }
  };

  // Update preview on code change
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      try {
        if (!htmlCode) {
          setPreviewHtml('');
          setPages([]);
          return;
        }

        const rendered = renderHTMLTemplate(htmlCode, SAMPLE_DATA);

        if (!rendered || typeof rendered !== 'string') {
          throw new Error('Template engine returned invalid result');
        }

        setPreviewHtml(rendered);
        const pageCount = getPageCount(rendered);
        setPages([{ id: 0, content: rendered, pageCount }]);
      } catch (error) {
        console.error('Render error:', error);
        const errorHtml = `<div style="color: #991b1b; padding: 20px; font-family: monospace; white-space: pre-wrap; border: 1px solid #fecaca; background: #fee2e2; border-radius: 4px;"><strong>Error:</strong> ${error?.message || 'Unknown error'}</div>`;
        setPreviewHtml(errorHtml);
        setPages([]);
      }
    }, 500);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [htmlCode]);

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      onChange(htmlCode);
    }
  }, [htmlCode, onChange]);

  // Initialize with value prop
  useEffect(() => {
    if (value && value !== htmlCode) {
      setHtmlCode(value);
    }
  }, [value]);

  // Handle resizable divider
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      if (newWidth >= 30 && newWidth <= 70) {
        setEditorWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'auto';
      document.body.style.cursor = 'auto';
    };
  }, [isDragging]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.languages.html.htmlDefaults.setOptions({
      format: { tabSize: 2, insertSpaces: true },
      suggest: { html5: true }
    });
  };

  const handleInsertPlaceholder = (placeholder) => {
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      const text = `{{${placeholder}}}`;
      const op = {
        identifier: { major: 1, minor: 1 },
        range: selection,
        text: text,
        forceMoveMarkers: true
      };
      editorRef.current.executeEdits('insert-placeholder', [op]);
      editorRef.current.focus();
    }
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const placeholders = getAvailablePlaceholders();
  const constants = getConstantsDocumentation();

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-slate-50">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <FileCode className="w-3 h-3" />
            HTML/CSS Editor
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={showPlaceholders ? "default" : "outline"} size="sm" onClick={() => setShowPlaceholders(!showPlaceholders)} className="gap-1">
                  <Code className="w-4 h-4" />
                  Placeholders
                </Button>
              </TooltipTrigger>
              <TooltipContent>Show available placeholders</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={showConstants ? "default" : "outline"} size="sm" onClick={() => setShowConstants(!showConstants)} className="gap-1">
                  <HelpCircle className="w-4 h-4" />
                  Constants
                </Button>
              </TooltipTrigger>
              <TooltipContent>Show template constants</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setIsPreviewMaximized(!isPreviewMaximized)} className="gap-1">
                  {isPreviewMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isPreviewMaximized ? 'Restore' : 'Maximize'} preview</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden" ref={containerRef}>
        {/* Editor */}
        {!isPreviewMaximized && (
          <div style={{ width: `${editorWidth}%` }} className="border-r flex flex-col transition-all">
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="html"
                value={htmlCode}
                onChange={setHtmlCode}
                onMount={handleEditorDidMount}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  roundedSelection: true,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on'
                }}
              />
            </div>

            {showPlaceholders && (
              <div className="h-48 border-t overflow-y-auto bg-white p-3">
                <Label className="text-xs font-semibold mb-2 block">Available Placeholders</Label>
                <div className="grid grid-cols-2 gap-1">
                  {placeholders.map(({ placeholder, description }) => {
                    const cleanPlaceholder = placeholder.replace(/{{|}}/g, '');
                    return (
                      <TooltipProvider key={placeholder}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => handleInsertPlaceholder(cleanPlaceholder)} className="text-left px-2 py-1 text-xs font-mono bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 flex items-center justify-between group">
                              <span className="truncate">{placeholder}</span>
                              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-xs font-semibold mb-1">{placeholder}</p><p className="text-xs text-slate-600">{description}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            )}

            {showConstants && (
              <div className="h-48 border-t overflow-y-auto bg-white p-3">
                <Label className="text-xs font-semibold mb-2 block">Template Constants</Label>
                <div className="space-y-3">
                  {constants.map(({ category, constants: categoryConstants }) => (
                    <div key={category}>
                      <div className="text-xs font-semibold text-slate-600 mb-1">{category}</div>
                      <div className="grid grid-cols-2 gap-1">
                        {categoryConstants.map(({ name, value, description }) => (
                          <TooltipProvider key={name}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button onClick={() => handleCopyToClipboard(`{{${name}}}`)} className="text-left px-2 py-1 text-xs font-mono bg-green-50 hover:bg-green-100 rounded border border-green-200 flex items-center justify-between group">
                                  <span className="truncate">{`{{${name}}}`}</span>
                                  <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent><p className="text-xs font-semibold">{description}</p><p className="text-xs text-slate-400">Value: {value}</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        {!isPreviewMaximized && (
          <div onMouseDown={() => setIsDragging(true)} className="w-1 bg-slate-300 hover:bg-blue-500 cursor-col-resize transition-colors group flex items-center justify-center">
            <div className="w-1 h-8 bg-slate-200 group-hover:bg-blue-400 rounded opacity-0 group-hover:opacity-100 transition-all" />
          </div>
        )}

        {/* Preview */}
        <div style={{ width: isPreviewMaximized ? '100%' : `${100 - editorWidth}%` }} className="flex flex-col bg-slate-50 transition-all">
          <div className="flex items-center justify-between p-3 bg-white border-b">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-600" />
              <Label className="text-sm font-medium">Live Preview (Sample Data)</Label>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 bg-slate-100" ref={previewContainerRef}>
            <style dangerouslySetInnerHTML={{ __html: `
              .template-preview-container {
                width: 100%;
                margin: 0 auto;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 24px;
              }

              .template-preview-page {
                background: white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                overflow: hidden;
                /* Scale: 1pt = 1.333px, so 612pt ≈ 816px at 96dpi */
                /* US Letter: 8.5" × 11" = 612pt × 792pt = 816px × 1056px at 96dpi */
                width: 816px;
                height: 1056px;
                position: relative;
              }

              .template-preview-page-content {
                width: 816px;
                position: relative;
              }

              .template-preview-page-number {
                position: absolute;
                bottom: 12px;
                right: 12px;
                background: rgba(255, 255, 255, 0.9);
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                color: #64748b;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                font-family: -apple-system, system-ui, sans-serif;
                z-index: 10;
              }
            `}} />

            {previewHtml ? (
              <div className="template-preview-container">
                {Array.from({ length: pages[0]?.pageCount || 1 }).map((_, pageIndex) => (
                  <div key={pageIndex} className="template-preview-page">
                    <div
                      className="template-preview-page-content"
                      style={{
                        marginTop: pageIndex === 0 ? '0' : `-${pageIndex * 1056}px`
                      }}
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                    <div className="template-preview-page-number">
                      Page {pageIndex + 1} of {pages[0]?.pageCount || 1}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="template-preview-page flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <FileCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Start typing to see preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplateCodeEditor;
