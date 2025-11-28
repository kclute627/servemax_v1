import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectItem,
} from '@/components/ui/select';
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

// Base sample data shared across all scenarios
const BASE_SAMPLE_DATA = {
  document_title: 'AFFIDAVIT OF SERVICE',
  status: 'served',
  include_notary: true,
  server_name: 'John Smith',
  server_license_number: 'IL-12345',
  case_number: '2025-CH-001234',
  court_name: 'Circuit Court of Cook County',
  full_court_name: 'United States District Court For The Northern District Of Illinois',
  court_county: 'Cook County',
  court_state: 'IL',
  case_caption: 'Jane Doe v. John Doe',
  plaintiff: 'Jane Doe, Mary Smith, Robert Johnson, Patricia Williams, Michael Brown, Jennifer Davis, William Miller, Elizabeth Wilson, David Moore, Susan Taylor, Joseph Anderson, Jessica Thomas, James Jackson, Barbara Martinez, Richard White, Linda Harris, Thomas Martin, Margaret Garcia, Charles Robinson, Dorothy Clark, George Rodriguez, Nancy Lewis, Kenneth Walker, Betty Hall, Edward Allen, Sandra Young, Ronald King, Deborah Wright, and Paul Lopez',
  defendant: 'John Doe, Sarah White, Christopher Harris, Nancy Martin, Daniel Thompson, Karen Garcia, Matthew Martinez, Betty Robinson, Anthony Clark, Lisa Rodriguez, Mark Lewis, Donna Lee, Steven Walker, Carol Hall, Kevin Allen, Michelle Scott, Brian Green, Emily Adams, Jason Baker, Melissa Nelson, Andrew Carter, Amanda Mitchell, Joshua Perez, Stephanie Roberts, Justin Turner, Rebecca Phillips, Ryan Campbell, Laura Parker, Brandon Evans, Nicole Edwards, and Aaron Collins',
  service_date: '2025-01-15',
  service_time: '2:30 PM',
  service_address: '123 Main St, Chicago, IL 60601',
  recipient_address: '123 Main St, Chicago, IL 60601',
  job_created_date: '2025-01-10T08:45:00Z',
  attempt_gps_lat: 41.878114,
  attempt_gps_lon: -87.629798,
  attempt_gps_accuracy: 5,
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
};

// Personal Service Scenario
const PERSONAL_SERVICE_DATA = {
  ...BASE_SAMPLE_DATA,
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
};

// Substitute Service Scenario
const SUBSTITUTE_SERVICE_DATA = {
  ...BASE_SAMPLE_DATA,
  service_manner: 'substitute',
  mailing_date: '2025-01-15',
  recipient_name: 'John Doe',
  person_served_name: 'Jane Doe',
  person_sex: 'Female',
  person_age: '38',
  person_height: '5\'6"',
  person_weight: '140 lbs',
  person_hair: 'Blonde',
  person_relationship: 'Wife',
  person_description_other: 'Wearing black slacks and white blouse',
};

// Corporate Service Scenario
const CORPORATE_SERVICE_DATA = {
  ...BASE_SAMPLE_DATA,
  service_manner: 'registered_agent',
  recipient_name: 'ABC Corporation',
  person_served_name: 'Michael Anderson',
  person_title: 'Registered Agent',
  company_being_served: 'ABC Corporation',
  person_sex: 'Male',
  person_age: '45',
  person_height: '6\'0"',
  person_weight: '190 lbs',
  person_hair: 'Gray',
  person_relationship: 'Registered Agent',
  person_description_other: 'Wearing business suit and tie',
};

// Non-Service Scenario
const NON_SERVICE_DATA = {
  ...BASE_SAMPLE_DATA,
  status: 'attempted',
  document_title: 'AFFIDAVIT OF DUE DILIGENCE',
  recipient_name: 'John Doe',
  recipient_address: '123 Main St, Chicago, IL 60601',
  service_attempts: [
    {
      date_time: 'January 15, 2025 at 8:30 AM',
      address: '123 Main St, Chicago, IL 60601',
      comments: 'No answer at door. Neighbors indicated resident works during day. Vehicle not present.'
    },
    {
      date_time: 'January 16, 2025 at 6:45 PM',
      address: '123 Main St, Chicago, IL 60601',
      comments: 'No answer at door. Lights were on inside but no response to knocking. Left business card.'
    },
    {
      date_time: 'January 18, 2025 at 7:15 AM',
      address: '123 Main St, Chicago, IL 60601',
      comments: 'Person at door refused to identify themselves or accept service. Appeared to match description of defendant.'
    },
    {
      date_time: 'January 20, 2025 at 5:30 PM',
      address: '123 Main St, Chicago, IL 60601',
      comments: 'No answer at door. Neighbor stated resident has been avoiding process servers and may have moved out.'
    }
  ]
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
  const [selectedScenario, setSelectedScenario] = useState('corporate');

  const editorRef = useRef(null);
  const debounceTimeout = useRef(null);
  const previewContainerRef = useRef(null);
  const containerRef = useRef(null);
  const pageRefs = useRef({});

  // Get sample data based on selected scenario
  const getSampleData = () => {
    switch(selectedScenario) {
      case 'personal': return PERSONAL_SERVICE_DATA;
      case 'substitute': return SUBSTITUTE_SERVICE_DATA;
      case 'corporate': return CORPORATE_SERVICE_DATA;
      case 'nonservice': return NON_SERVICE_DATA;
      default: return CORPORATE_SERVICE_DATA;
    }
  };

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

  // Paginate content respecting CSS page breaks (like Puppeteer does)
  const paginateContent = (htmlContent) => {
    if (!htmlContent) return [];

    try {
      // Create temporary container to measure content
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.visibility = 'hidden';
      container.style.width = '816px'; // US Letter width at 96dpi (612pt)
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      const PAGE_HEIGHT = 1056; // US Letter height at 96dpi (792pt)
      const pages = [];
      let currentPage = document.createElement('div');
      let currentHeight = 0;

      // Walk through all child elements of the main container
      const mainContainer = container.querySelector('[style*="612pt"]') || container.firstElementChild;
      if (!mainContainer) {
        document.body.removeChild(container);
        return [htmlContent];
      }

      const children = Array.from(mainContainer.children);

      const containerStyle = mainContainer.getAttribute('style') || '';

      children.forEach((child) => {
        // Clone element to measure its height
        const clone = child.cloneNode(true);
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = '816px';
        tempDiv.appendChild(clone);
        document.body.appendChild(tempDiv);

        const elementHeight = tempDiv.offsetHeight;
        document.body.removeChild(tempDiv);

        // Check if element has page-break-inside: avoid or break-inside: avoid
        const computedStyle = window.getComputedStyle(child);
        const shouldKeepTogether = computedStyle.pageBreakInside === 'avoid' ||
                                   computedStyle.breakInside === 'avoid' ||
                                   child.style.pageBreakInside === 'avoid' ||
                                   child.style.breakInside === 'avoid';

        // If element would overflow page and should stay together, move to next page
        if (shouldKeepTogether && currentHeight + elementHeight > PAGE_HEIGHT && currentHeight > 0) {
          // Wrap current page content in container div
          const pageWrapper = document.createElement('div');
          pageWrapper.setAttribute('style', containerStyle);
          pageWrapper.innerHTML = currentPage.innerHTML;
          pages.push(pageWrapper.outerHTML);

          currentPage = document.createElement('div');
          currentHeight = 0;
        }

        // Add element to current page
        currentPage.appendChild(child.cloneNode(true));
        currentHeight += elementHeight;

        // If current page is full, start new page
        if (currentHeight >= PAGE_HEIGHT && !shouldKeepTogether) {
          // Wrap current page content in container div
          const pageWrapper = document.createElement('div');
          pageWrapper.setAttribute('style', containerStyle);
          pageWrapper.innerHTML = currentPage.innerHTML;
          pages.push(pageWrapper.outerHTML);

          currentPage = document.createElement('div');
          currentHeight = 0;
        }
      });

      // Add remaining content
      if (currentPage.children.length > 0) {
        const pageWrapper = document.createElement('div');
        pageWrapper.setAttribute('style', containerStyle);
        pageWrapper.innerHTML = currentPage.innerHTML;
        pages.push(pageWrapper.outerHTML);
      }

      document.body.removeChild(container);

      return pages.length > 0 ? pages : [htmlContent];
    } catch (error) {
      console.error('Pagination error:', error);
      return [htmlContent];
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

        const rendered = renderHTMLTemplate(htmlCode, getSampleData());

        if (!rendered || typeof rendered !== 'string') {
          throw new Error('Template engine returned invalid result');
        }

        // Paginate content respecting page breaks
        const paginatedPages = paginateContent(rendered);
        setPages(paginatedPages);
        setPreviewHtml(rendered); // Keep for backwards compatibility
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
  }, [htmlCode, selectedScenario]);

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
              <Label className="text-sm font-medium">Live Preview</Label>
            </div>
            <Select
              className="w-[180px]"
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
            >
              <SelectItem value="personal">Personal Service</SelectItem>
              <SelectItem value="substitute">Substitute Service</SelectItem>
              <SelectItem value="corporate">Corporate Service</SelectItem>
              <SelectItem value="nonservice">Non Service</SelectItem>
            </Select>
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

            {pages.length > 0 ? (
              <div className="template-preview-container">
                {pages.map((pageContent, pageIndex) => (
                  <div key={pageIndex} className="template-preview-page">
                    <div
                      className="template-preview-page-content"
                      dangerouslySetInnerHTML={{ __html: pageContent }}
                    />
                    <div className="template-preview-page-number">
                      Page {pageIndex + 1} of {pages.length}
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
