import React, { useState, useEffect, useRef } from 'react';
import { renderHTMLTemplate } from '@/utils/templateEngine';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { PenTool, X } from 'lucide-react';

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
 * Draggable and Resizable Signature Component
 */
function DraggableSignature({ signatureData, position, size, onPositionChange, onSizeChange, onRemove, containerRef }) {
    const signatureRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });

    // Drag handlers
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

    // Resize handlers
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

            {/* Resize handle (bottom-right corner) */}
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
 * Editable component for Standard Affidavit
 * Like a Word document - user can click and edit text directly
 * Pagination for view mode only - edit mode is one continuous scrollable page
 */
export default function StandardAffidavitInteractiveForm({ affidavitData, template, isEditing, onDataChange }) {
    const contentRef = useRef(null);
    const containerRef = useRef(null);
    const [paginatedPages, setPaginatedPages] = useState([]);
    const [user, setUser] = useState(null);
    const [signaturePosition, setSignaturePosition] = useState(
        affidavitData?.placed_signature?.position || { x: 340, y: 620 }
    );
    const [signatureSize, setSignatureSize] = useState(
        affidavitData?.placed_signature?.size || { width: 180, height: 50 }
    );

    // Load current user to check for saved signature
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const u = await User.me();
                setUser(u);
            } catch (e) {
                console.error("User not found");
            }
        };
        fetchUser();
    }, []);

    // Sync signature position/size from affidavitData
    useEffect(() => {
        if (affidavitData?.placed_signature?.position) {
            setSignaturePosition(affidavitData.placed_signature.position);
        }
        if (affidavitData?.placed_signature?.size) {
            setSignatureSize(affidavitData.placed_signature.size);
        }
    }, [affidavitData?.placed_signature]);

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

    const handleSignaturePlace = () => {
        if (!user?.e_signature?.signature_data) {
            alert('No signature found. Please create a signature in Settings > My Settings first.');
            return;
        }

        // Calculate percentage position for reliable PDF positioning
        let positionPercent = { x: 0.5, y: 0.78 }; // Default: centered, near bottom
        if (containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            positionPercent = {
                x: signaturePosition.x / containerRect.width,
                y: signaturePosition.y / containerRect.height
            };
        }

        const signatureData = {
            signature_data: user.e_signature.signature_data,
            signature_type: user.e_signature.signature_type,
            signature_color: user.e_signature.signature_color,
            signed_date: new Date().toISOString(),
            signer_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
            position: signaturePosition,
            positionPercent: positionPercent,
            size: signatureSize
        };

        onDataChange('placed_signature', signatureData);
    };

    const handleSignatureRemove = () => {
        onDataChange('placed_signature', null);
    };

    const handlePositionChange = (newPosition) => {
        setSignaturePosition(newPosition);
        if (affidavitData?.placed_signature && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            // Store both pixel position AND percentage for reliable PDF positioning
            onDataChange('placed_signature', {
                ...affidavitData.placed_signature,
                position: newPosition,
                positionPercent: {
                    x: newPosition.x / containerRect.width,
                    y: newPosition.y / containerRect.height
                }
            });
        }
    };

    const handleSizeChange = (newSize) => {
        setSignatureSize(newSize);
        if (affidavitData?.placed_signature) {
            onDataChange('placed_signature', {
                ...affidavitData.placed_signature,
                size: newSize
            });
        }
    };

    const hasUserSignature = user?.e_signature?.signature_data;
    const hasPlacedSignature = affidavitData?.placed_signature?.signature_data;

    console.log('[StandardAffidavitInteractiveForm] Rendering');
    console.log('[StandardAffidavitInteractiveForm] isEditing:', isEditing);
    console.log('[StandardAffidavitInteractiveForm] hasUserSignature:', hasUserSignature);
    console.log('[StandardAffidavitInteractiveForm] hasPlacedSignature:', hasPlacedSignature);

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

    // VIEW MODE: Paginated display with signature overlay
    const selectedPhotos = affidavitData?.selected_photos || [];

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            {paginatedPages.map((pageHTML, index) => (
                <React.Fragment key={index}>
                    <div
                        style={{
                            width: '612pt',
                            minHeight: '792pt',
                            backgroundColor: '#FFFFFF',
                            position: 'relative'
                        }}
                    >
                        <div dangerouslySetInnerHTML={{ __html: pageHTML }} />

                        {/* Signature overlay - only on last page */}
                        {index === paginatedPages.length - 1 && (
                            <>
                                {/* Sign button - shows when user has signature but hasn't placed it */}
                                {hasUserSignature && !hasPlacedSignature && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '120pt',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        zIndex: 10
                                    }}>
                                        <Button
                                            onClick={handleSignaturePlace}
                                            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                                        >
                                            <PenTool className="w-4 h-4" />
                                            Sign Affidavit
                                        </Button>
                                    </div>
                                )}

                                {/* Draggable signature - shows when signature is placed */}
                                {hasPlacedSignature && (
                                    <DraggableSignature
                                        signatureData={affidavitData.placed_signature.signature_data}
                                        position={signaturePosition}
                                        size={signatureSize}
                                        onPositionChange={handlePositionChange}
                                        onSizeChange={handleSizeChange}
                                        onRemove={handleSignatureRemove}
                                        containerRef={containerRef}
                                    />
                                )}
                            </>
                        )}
                    </div>
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

            {/* Photo Exhibits - display selected photos after affidavit pages */}
            {selectedPhotos.length > 0 && (
                <>
                    {/* Page break indicator before photos */}
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
                        — Photo Exhibits —
                    </div>

                    {/* Render each photo as an exhibit page */}
                    {selectedPhotos.map((photo, photoIndex) => (
                        <React.Fragment key={`photo-${photoIndex}`}>
                            <div
                                style={{
                                    width: '612pt',
                                    minHeight: '792pt',
                                    backgroundColor: '#FFFFFF',
                                    padding: '36pt',
                                    boxSizing: 'border-box',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center'
                                }}
                            >
                                {/* Photo container */}
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    marginBottom: '24pt'
                                }}>
                                    <img
                                        src={photo.file_url}
                                        alt={`Exhibit ${photoIndex + 1}`}
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '650pt',
                                            objectFit: 'contain',
                                            border: '1px solid #E5E7EB'
                                        }}
                                    />
                                </div>

                                {/* Exhibit label */}
                                <div style={{
                                    fontFamily: 'Times New Roman, Times, serif',
                                    fontSize: '14pt',
                                    fontWeight: 'bold',
                                    textAlign: 'center'
                                }}>
                                    EXHIBIT {photoIndex + 1}
                                </div>
                            </div>

                            {/* Page break between photos */}
                            {photoIndex < selectedPhotos.length - 1 && (
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
                                    — Exhibit {photoIndex + 1} / Exhibit {photoIndex + 2} —
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </>
            )}
        </div>
    );
}
