import React, { useState, useEffect, useRef } from 'react';
import { renderHTMLTemplate } from '@/utils/templateEngine';

/**
 * Intelligently paginate HTML content respecting CSS page breaks
 * Same logic as in TemplateCodeEditor for consistent pagination
 */
const paginateContent = (htmlContent) => {
  if (!htmlContent) return [];

  try {
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

    const mainContainer = container.querySelector('[style*="612pt"]') || container.firstElementChild;
    if (!mainContainer) {
      document.body.removeChild(container);
      return [htmlContent];
    }

    const children = Array.from(mainContainer.children);
    const containerStyle = mainContainer.getAttribute('style') || '';

    children.forEach((child) => {
      // Measure element height
      const clone = child.cloneNode(true);
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '816px';
      tempDiv.appendChild(clone);
      document.body.appendChild(tempDiv);
      const elementHeight = tempDiv.offsetHeight;
      document.body.removeChild(tempDiv);

      // Check if element should stay together
      const computedStyle = window.getComputedStyle(child);
      const shouldKeepTogether = computedStyle.pageBreakInside === 'avoid' ||
                                 computedStyle.breakInside === 'avoid' ||
                                 child.style.pageBreakInside === 'avoid' ||
                                 child.style.breakInside === 'avoid';

      // If element would overflow page and should stay together, move to next page
      if (shouldKeepTogether && currentHeight + elementHeight > PAGE_HEIGHT && currentHeight > 0) {
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

/**
 * Editable component for Standard Affidavit
 * Like a Word document - user can click and edit text directly
 * Pagination for view mode only - edit mode is one continuous scrollable page
 */
export default function StandardAffidavitInteractiveForm({ affidavitData, template, isEditing, onDataChange }) {
    const contentRef = useRef(null);
    const [paginatedPages, setPaginatedPages] = useState([]);

    if (!affidavitData || !template?.html_content) {
        return null;
    }

    // Use edited HTML if available, otherwise render fresh from template
    const htmlToRender = affidavitData.html_content_edited ||
                         renderHTMLTemplate(template.html_content, affidavitData);

    // Paginate for view mode display only
    useEffect(() => {
        if (!isEditing) {
            const pages = paginateContent(htmlToRender);
            setPaginatedPages(pages);
        }
    }, [htmlToRender, isEditing]);

    const handleBlur = () => {
        if (contentRef.current && onDataChange) {
            const capturedHTML = contentRef.current.innerHTML;
            console.log('[StandardAffidavitInteractiveForm] Blur - capturing HTML, length:', capturedHTML.length);
            onDataChange('html_content_edited', capturedHTML);
        }
    };

    console.log('[StandardAffidavitInteractiveForm] Rendering');
    console.log('[StandardAffidavitInteractiveForm] isEditing:', isEditing);
    console.log('[StandardAffidavitInteractiveForm] HTML length:', htmlToRender.length);
    console.log('[StandardAffidavitInteractiveForm] Has html_content_edited:', !!affidavitData.html_content_edited);

    // EDIT MODE: Single contentEditable div (like Word document)
    if (isEditing) {
        return (
            <div
                ref={contentRef}
                contentEditable={true}
                suppressContentEditableWarning={true}
                onBlur={handleBlur}
                style={{
                    width: '612pt',
                    minHeight: '792pt',
                    backgroundColor: '#FFFFFF',
                    outline: '2px solid #3B82F6',
                    padding: '0',
                    cursor: 'text'
                }}
                dangerouslySetInnerHTML={{ __html: htmlToRender }}
            />
        );
    }

    // VIEW MODE: Paginated display with page separators
    return (
        <>
            {paginatedPages.map((pageHTML, index) => (
                <React.Fragment key={index}>
                    <div
                        style={{
                            width: '612pt',
                            minHeight: '792pt',
                            backgroundColor: '#FFFFFF'
                        }}
                        dangerouslySetInnerHTML={{ __html: pageHTML }}
                    />
                    {index < paginatedPages.length - 1 && (
                        <div
                            style={{
                                height: '20px',
                                backgroundColor: '#E5E7EB',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10pt',
                                fontFamily: 'system-ui, sans-serif',
                                color: '#6B7280',
                                fontWeight: '500'
                            }}
                        >
                            — Page {index + 1} / Page {index + 2} —
                        </div>
                    )}
                </React.Fragment>
            ))}
        </>
    );
}
