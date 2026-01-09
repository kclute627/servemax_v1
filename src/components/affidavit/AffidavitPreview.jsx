
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { format } from 'date-fns';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { replacePlaceholders, renderHTMLTemplate } from '@/utils/templateEngine';
import AO440EditableFields from './AO440EditableFields';
import AO440InteractiveForm from './AO440InteractiveForm';
import StandardAffidavitInteractiveForm from './StandardAffidavitInteractiveForm';

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

const EditableField = ({ value, isEditing, onChange, as = 'input', className = '', ...props }) => {
    const Component = as;

    if (isEditing) {
        if (Component === 'textarea') {
            return (
                <textarea
                    value={value}
                    onChange={onChange}
                    className={`w-full bg-blue-50 border border-blue-200 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 min-h-[20pt] ${className}`}
                    style={{ fontFamily: 'Times, serif', fontSize: '10pt' }}
                    {...props}
                />
            );
        }
        return (
            <input
                type="text"
                value={value}
                onChange={onChange}
                className={`w-full bg-blue-50 border border-blue-200 rounded p-1 focus:outline-none focus:ring-1 focus:ring-blue-400 ${className}`}
                style={{ fontFamily: 'Times, serif', fontSize: '10pt' }}
                {...props}
            />
        );
    }
    return <div className={className} style={{ fontFamily: 'Times, serif', fontSize: '10pt', lineHeight: '12pt' }}>{value}</div>;
};

export default function AffidavitPreview({ affidavitData, template, isEditing, onDataChange, selectedPhotos = [] }) {
    const [user, setUser] = useState(null);
    const [placedSignature, setPlacedSignature] = useState(affidavitData?.placed_signature || null);
    const [isDragging, setIsDragging] = useState(false);
    const [signaturePosition, setSignaturePosition] = useState({ x: 0, y: 2 });
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [paginatedPages, setPaginatedPages] = useState([]);
    const pageRefs = useRef([]);
    const wasEditingRef = useRef(isEditing);
    const editSessionInitialized = useRef(false);

    const signatureRef = useRef(null);
    const signatureContainerRef = useRef(null);
    console.log('Selected Photos:', selectedPhotos);

    // Inside AffidavitPreview component, after state declarations
    const renderPhotoExhibits = () => {
        if (!selectedPhotos || selectedPhotos.length === 0) {
            return null;
        }

        return selectedPhotos.map((photo, index) => {
            const exhibitNumber = index + 1;



            return (
                <div
                    key={`exhibit-${exhibitNumber}`}
                    style={{
                        width: '612pt',
                        minHeight: '792pt',
                        backgroundColor: '#FFFFFF',
                        padding: '40pt',
                        pageBreakBefore: 'always',
                        marginTop: '20pt',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative'
                    }}
                >
                    {/* Photo - Top/Center */}
                    <div>
                        <img
                            src={photo.file_url}
                            alt={`Exhibit ${exhibitNumber}`}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '600pt',
                                height: 'auto',
                                objectFit: 'contain'
                            }}
                        />
                    </div>

                    {/* Photo Metadata - Middle */}
                    {(photo.attemptDate || photo.address_of_attempt) && (
                        <div style={{
                            marginTop: '5pt',
                            marginBottom: 'auto',
                            fontSize: '8pt',
                            color: '#333333',
                            textAlign: 'left',
                            paddingLeft: '0'
                        }}>
                            {photo.attemptDate && (
                                <div style={{
                                    marginBottom: '12pt',
                                    fontWeight: 'normal'
                                }}>
                                    {format(new Date(photo.attemptDate), 'MMM d, yyyy h:mm a')}
                                </div>
                            )}
                            {photo.address_of_attempt && (
                                <div style={{
                                    fontSize: '7pt',
                                    color: '#4d4d4d'
                                }}>
                                    {photo.address_of_attempt.length > 35
                                        ? photo.address_of_attempt.substring(0, 32) + '...'
                                        : photo.address_of_attempt}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Exhibit Footer - Bottom */}
                    <div style={{
                        textAlign: 'center',
                        fontSize: '16pt',
                        fontWeight: 'bold',
                        marginTop: 'auto',
                        paddingTop: '20pt',
                    }}>
                        EXHIBIT {exhibitNumber}
                    </div>
                </div>
            );
        });
    };

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

    useEffect(() => {
        setPlacedSignature(affidavitData?.placed_signature || null);
        if (affidavitData?.placed_signature?.position) {
            setSignaturePosition(affidavitData.placed_signature.position);
        }
    }, [affidavitData]);

    // Paginate HTML content when template or data changes
    useEffect(() => {
        if (template?.template_mode === 'html' && template?.html_content && affidavitData) {
            // Skip pagination for edited content in view mode (will render directly)
            if (affidavitData.html_content_edited && !isEditing) {
                console.log('[AffidavitPreview] Skipping pagination for edited content in view mode');
                console.log('[AffidavitPreview] html_content_edited length:', affidavitData.html_content_edited.length);
                setPaginatedPages([]); // Clear pagination
                return;
            }

            // Use edited HTML if available, otherwise render from template
            const htmlToUse = affidavitData.html_content_edited || renderHTMLTemplate(template.html_content, affidavitData);
            console.log('[AffidavitPreview] Paginating HTML, length:', htmlToUse.length);
            const pages = paginateContent(htmlToUse);
            console.log('[AffidavitPreview] Generated pages:', pages.length);
            setPaginatedPages(pages);
        }
    }, [template, affidavitData, isEditing]);

    // Set innerHTML on page refs when entering edit mode (avoid cursor jump)
    useEffect(() => {
        if (isEditing && paginatedPages.length > 0 && !editSessionInitialized.current) {
            console.log('[AffidavitPreview] Initializing edit session, setting innerHTML on refs');
            // Wait for refs to be available
            setTimeout(() => {
                paginatedPages.forEach((pageHTML, index) => {
                    if (pageRefs.current[index]) {
                        pageRefs.current[index].innerHTML = pageHTML;
                        console.log(`[AffidavitPreview] Set innerHTML for page ${index}, length:`, pageHTML.length);
                    }
                });
                editSessionInitialized.current = true;
            }, 0);
        } else if (!isEditing) {
            // Reset initialization flag when exiting edit mode
            editSessionInitialized.current = false;
        }
    }, [paginatedPages, isEditing]);

    // Capture HTML when exiting edit mode (useLayoutEffect runs BEFORE DOM updates)
    useLayoutEffect(() => {
        // If we were editing and now we're not, capture the HTML
        if (wasEditingRef.current && !isEditing) {
            console.log('[AffidavitPreview] Exiting edit mode, capturing HTML...');
            captureEditedHTML();
        }
        wasEditingRef.current = isEditing;
    }, [isEditing]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging || !signatureContainerRef.current) return;

            const containerRect = signatureContainerRef.current.getBoundingClientRect();

            let newX = e.clientX - containerRect.left - dragOffset.x;
            let newY = e.clientY - containerRect.top - dragOffset.y;

            newX = Math.max(0, Math.min(newX, containerRect.width - 180)); // Adjusted for signature image size
            newY = Math.max(0, Math.min(newY, containerRect.height - 35)); // Adjusted for signature image size

            setSignaturePosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                onDataChange('placed_signature', { ...placedSignature, position: signaturePosition });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, placedSignature, signaturePosition, onDataChange]);

    if (!affidavitData) return null;

    const {
        document_title,
        case_caption,
        case_number,
        court_name,
        court_county,
        server_name,
        server_license_number,
        documents_served,
        service_date,
        service_time,
        service_manner,
        service_manner_other,
        include_notary,
        include_company_info,
        company_info, // This field is now expected to be an object based on the outline
    } = affidavitData;

    const plaintiff = case_caption?.split('v.')[0]?.trim() || '';
    const defendant = case_caption?.split('v.')[1]?.trim() || '';

    // service_date is already a full ISO timestamp, don't append anything
    const serviceDate = service_date ? format(new Date(service_date), 'MMMM d, yyyy h:mm a') : '';

    const handleFieldChange = (field, value) => {
        onDataChange(field, value);
    };

    const placeSignature = () => {
        if (!isEditing || !user || !user.e_signature?.signature_data || placedSignature) return;

        const signatureDataToPlace = {
            signature_data: user.e_signature.signature_data,
            signed_date: new Date().toISOString()
        };
        setPlacedSignature(signatureDataToPlace);
        onDataChange('placed_signature', signatureDataToPlace);
        setSignaturePosition({ x: 0, y: 2 });
    };

    const captureEditedHTML = () => {
        console.log('[captureEditedHTML] Called');
        console.log('[captureEditedHTML] Number of page refs:', pageRefs.current.length);

        if (pageRefs.current.length > 0) {
            const validRefs = pageRefs.current.filter(ref => ref !== null);
            console.log('[captureEditedHTML] Valid refs:', validRefs.length);

            // Join all page content
            const allContent = validRefs
                .map((ref, index) => {
                    const html = ref.innerHTML;
                    console.log(`[captureEditedHTML] Page ${index} HTML length:`, html.length);
                    return html;
                })
                .join('');

            // Reconstruct original container structure
            // Use the standard container style from templates
            const containerStyle = 'width: 612pt; padding: 12pt 24pt; font-family: Times New Roman, Times, serif; font-size: 13pt; line-height: 1.5; color: #000000; background-color: #FFFFFF; box-sizing: border-box;';

            const fullHTML = `<div style="${containerStyle}">${allContent}</div>`;

            console.log('[captureEditedHTML] Full HTML length:', fullHTML.length);
            console.log('[captureEditedHTML] First 200 chars:', fullHTML.substring(0, 200));
            onDataChange('html_content_edited', fullHTML);
        } else {
            console.log('[captureEditedHTML] No page refs found!');
        }
    };

    const handleMouseDown = (e) => {
        if (!placedSignature || !isEditing || !signatureRef.current) return;

        setIsDragging(true);
        const signatureRect = signatureRef.current.getBoundingClientRect();

        setDragOffset({
            x: e.clientX - signatureRect.left,
            y: e.clientY - signatureRect.top
        });
    };

    // Exact PDF styling with precise measurements
    const documentStyle = {
        width: '612pt',
        height: '792pt',
        padding: '72pt', // 1 inch margin
        fontFamily: 'Times, serif',
        fontSize: '10pt',
        lineHeight: '1.5', // Changed to 1.5 for better spacing
        color: '#000000',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        backgroundColor: 'white', // Added background color
    };

    const titleStyle = {
        fontSize: '16pt',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: '20pt',
        fontFamily: 'Times, serif',
    };

    const tableStyle = {
        borderCollapse: 'collapse',
        width: '100%',
        marginBottom: '20pt',
    };

    // Refactored cell style into a function for reusability and dynamic headers
    const cellStyle = (isHeader = false, customBorder = '1pt solid #CBCBCB') => ({
        padding: '5pt',
        border: customBorder,
        fontSize: isHeader ? '8pt' : '10pt',
        fontFamily: 'Times, serif',
        lineHeight: '12pt',
        fontWeight: isHeader ? 'bold' : 'normal',
        color: isHeader ? '#666666' : '#000000',
        backgroundColor: isHeader ? '#F8FAFC' : 'transparent', // Light background for headers
        verticalAlign: 'top', // Ensure content starts at top
    });

    const singleLineInputStyle = {
        fontFamily: 'Times, serif',
        fontSize: '10pt',
        lineHeight: '12pt'
    };

    // Render HTML template if template has HTML mode
    if (template?.template_mode === 'html' && template?.html_content) {
        const renderedHTML = renderHTMLTemplate(template.html_content, affidavitData);

        // Check if this is the AO 440 template (original version, not CSS test)
        const isAO440Template = (template?.id === 'ao440_federal' ||
            template?.name?.includes('AO 440') ||
            template?.name?.includes('Federal Proof of Service')) &&
            !template?.id?.includes('css_test') &&
            !template?.name?.toLowerCase().includes('css test') &&
            !template?.uses_table_layout;

        // AO 440 Template - ALWAYS use interactive form component (in both edit and view modes)
        if (isAO440Template) {
            console.log('[AffidavitPreview] Rendering AO440 with isEditing:', isEditing);
            console.log('[AffidavitPreview] affidavitData.placed_signature:', affidavitData?.placed_signature ? 'EXISTS' : 'NULL');

            return (
                <>
                    <AO440InteractiveForm
                        key={isEditing ? 'editing' : 'viewing'}
                        affidavitData={affidavitData}
                        onDataChange={onDataChange}
                        isEditing={isEditing}
                    />
                    {renderPhotoExhibits()}
                </>
            );
        }

        // Check if this is the Standard Affidavit template OR a CSS test template
        // CSS test templates use the same table-based approach as Standard
        const isStandardTemplate = template?.id === 'standard' ||
            template?.name?.includes('Standard Affidavit');

        const isCSSTestTemplate = template?.id?.includes('css_test') ||
            template?.name?.toLowerCase().includes('css test') ||
            template?.uses_table_layout === true;

        // Standard Affidavit and CSS Test templates - use simple rendering component
        // This handles table-based layouts properly for both preview and PDF
        if (isStandardTemplate || isCSSTestTemplate) {
            console.log('[AffidavitPreview] Rendering with StandardAffidavitInteractiveForm');
            console.log('[AffidavitPreview] Template:', template?.name, 'isCSSTest:', isCSSTestTemplate);

            return (
                <>
                    <StandardAffidavitInteractiveForm
                        key={isEditing ? 'editing' : 'viewing'}
                        affidavitData={affidavitData}
                        template={template}
                        isEditing={isEditing}
                        onDataChange={onDataChange}
                    />
                    {renderPhotoExhibits()}
                </>
            );
        }

        // For other HTML templates, if not editing, render content
        if (!isEditing) {
            console.log('[AffidavitPreview] VIEW MODE');
            console.log('[AffidavitPreview] Has html_content_edited?', !!affidavitData.html_content_edited);
            console.log('[AffidavitPreview] paginatedPages length:', paginatedPages.length);

            // If user has edited the content, render it directly without pagination
            if (affidavitData.html_content_edited) {
                console.log('[AffidavitPreview] Rendering edited HTML directly (no pagination)');
                console.log('[AffidavitPreview] Edited HTML length:', affidavitData.html_content_edited.length);
                console.log('[AffidavitPreview] First 300 chars:', affidavitData.html_content_edited.substring(0, 300));
                return (
                    <>
                        <div
                            style={{
                                width: '612pt',
                                minHeight: '792pt',
                                backgroundColor: '#FFFFFF'
                            }}
                            dangerouslySetInnerHTML={{ __html: affidavitData.html_content_edited }}
                        />

                        {renderPhotoExhibits()}
                    </>
                );
            }

            // Otherwise, render paginated fresh content
            console.log('[AffidavitPreview] Rendering paginated content, pages:', paginatedPages.length);
            if (paginatedPages.length === 0) {
                console.log('[AffidavitPreview] WARNING: No paginated pages to render!');
            }
            return (
                <>
                    {paginatedPages.map((pageHTML, index) => (
                        <React.Fragment key={index}>
                            <div
                                style={{
                                    width: '612pt',
                                    height: '792pt',
                                    backgroundColor: '#FFFFFF'
                                }}
                                dangerouslySetInnerHTML={{ __html: pageHTML }}
                            />
                            {index < paginatedPages.length - 1 && (
                                <div style={{ height: '20px', backgroundColor: '#E5E7EB' }} />
                            )}
                        </React.Fragment>
                    ))}
                    {/* Add photos after main content */}
                    {renderPhotoExhibits()}
                </>
            );
        }

        // Other HTML templates - Edit mode: show paginated view with page break indicators
        return (
            <>
                {paginatedPages.map((pageHTML, index) => (
                    <React.Fragment key={index}>
                        <div
                            ref={el => pageRefs.current[index] = el}
                            style={{
                                width: '612pt',
                                minHeight: '792pt',
                                backgroundColor: '#FFFFFF',
                                position: 'relative',
                                padding: '0',
                                overflow: 'visible'
                            }}
                            className="html-template-editable"
                            contentEditable={true}
                            suppressContentEditableWarning={true}
                            onBlur={captureEditedHTML}
                        />
                        {index < paginatedPages.length - 1 && (
                            <div
                                style={{
                                    height: '60px',
                                    backgroundColor: '#E5E7EB',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderTop: '3px dashed #6B7280',
                                    borderBottom: '3px dashed #6B7280',
                                    fontSize: '11pt',
                                    fontFamily: 'system-ui, sans-serif',
                                    color: '#374151',
                                    fontWeight: '600',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase'
                                }}
                            >
                                ━━━━ PAGE {index + 1} / PAGE {index + 2} ━━━━
                            </div>
                        )}
                    </React.Fragment>
                ))}
                {renderPhotoExhibits()}
            </>
        );
    }

    // Legacy rendering for text-based templates
    return (
        <div style={documentStyle}>
            {/* Document Title */}
            <div style={titleStyle}>
                {isEditing ? (
                    <EditableField
                        value={document_title}
                        isEditing={isEditing}
                        onChange={e => handleFieldChange('document_title', e.target.value)}
                        style={titleStyle} // Applying titleStyle here means it won't be applied to the input itself, but the wrapper div.
                        className="text-center" // Center the editable field
                    />
                ) : (
                    document_title
                )}
            </div>

            {/* Case Information Table */}
            <table style={tableStyle}>
                <tbody>
                    <tr>
                        <td style={cellStyle(true)}>CASE NUMBER</td>
                        <td style={cellStyle(true)}>COURT</td>
                    </tr>
                    <tr>
                        <td style={cellStyle()}>
                            <EditableField value={case_number} isEditing={isEditing} onChange={e => handleFieldChange('case_number', e.target.value)} style={singleLineInputStyle} />
                        </td>
                        <td style={cellStyle()}>
                            <EditableField as="textarea" value={`${court_name || ''}\n${court_county || ''}`} isEditing={isEditing} onChange={e => {
                                const parts = e.target.value.split('\n');
                                handleFieldChange('court_name', parts[0] ? parts[0].trim() : '');
                                handleFieldChange('court_county', parts[1] ? parts[1].trim() : '');
                            }} />
                        </td>
                    </tr>
                    <tr>
                        <td style={cellStyle(true)}>PLAINTIFF / PETITIONER</td>
                        <td style={cellStyle(true)}>DEFENDANT / RESPONDENT</td>
                    </tr>
                    <tr>
                        <td style={cellStyle()}>
                            <EditableField value={plaintiff} isEditing={isEditing} onChange={e => handleFieldChange('case_caption', `${e.target.value} v. ${defendant}`)} style={singleLineInputStyle} />
                        </td>
                        <td style={cellStyle()}>
                            <EditableField value={defendant} isEditing={isEditing} onChange={e => handleFieldChange('case_caption', `${plaintiff} v. ${e.target.value}`)} style={singleLineInputStyle} />
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Main Declaration - Template Body or Default */}
            {template?.body ? (
                <div style={{ marginBottom: '20pt', fontSize: '10pt', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {replacePlaceholders(template.body, affidavitData)}
                </div>
            ) : (
                <div style={{ marginBottom: '20pt', fontSize: '10pt', lineHeight: '1.5' }}>
                    I, <EditableField
                        value={server_name}
                        isEditing={isEditing}
                        onChange={e => handleFieldChange('server_name', e.target.value)}
                        className="inline-block"
                        style={{ display: 'inline', minWidth: '120pt', ...singleLineInputStyle }}
                    />, being duly sworn, depose and say: I am over the age of 18 years and not a party to this action, and that within the boundaries of the state where service was effected, I was authorized by law to make service of the documents and informed said person of the contents herein.
                </div>
            )}

            {/* Service Details Table */}
            <table style={tableStyle}>
                <tbody>
                    <tr><td style={cellStyle(true)}>RECIPIENT NAME / ADDRESS</td></tr>
                    <tr>
                        <td style={cellStyle()}>
                            <EditableField as="textarea" value={`${affidavitData.recipient_name || ''}\n${affidavitData.service_address || ''}`} isEditing={isEditing} onChange={e => {
                                const parts = e.target.value.split('\n');
                                handleFieldChange('recipient_name', parts[0] || '');
                                handleFieldChange('service_address', parts.slice(1).join('\n'));
                            }} />
                        </td>
                    </tr>
                    <tr><td style={cellStyle(true)}>MANNER OF SERVICE</td></tr>
                    <tr>
                        <td style={cellStyle()}>
                            <EditableField value={service_manner === 'other' ? service_manner_other : (service_manner ? service_manner.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '')} isEditing={isEditing} onChange={e => handleFieldChange('service_manner', e.target.value)} style={singleLineInputStyle} />
                        </td>
                    </tr>
                    <tr><td style={cellStyle(true)}>DOCUMENTS</td></tr>
                    <tr>
                        <td style={cellStyle()}>
                            <EditableField as="textarea" value={documents_served && documents_served.length > 0 ? documents_served.map(d => d.title).join('\n') : ''} isEditing={isEditing} onChange={e => handleFieldChange('documents_served', e.target.value.split('\n').filter(Boolean).map(title => ({ title })))} />
                        </td>
                    </tr>
                    <tr><td style={cellStyle(true)}>DATE OF SERVICE</td></tr>
                    <tr>
                        <td style={cellStyle()}>
                            <EditableField
                                value={`${serviceDate} at approximately ${service_time || ''}`}
                                isEditing={isEditing}
                                onChange={() => { }} // This field is for display, not direct edit
                                style={singleLineInputStyle}
                            />
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Spacer to push signature to bottom */}
            <div style={{ flexGrow: 1 }}></div>

            {/* Declaration & Signature Area */}
            <div style={{ fontSize: '10pt', lineHeight: '1.5', width: '100%' }}>
                {template?.footer_text ? (
                    <p style={{ marginBottom: '25pt', whiteSpace: 'pre-wrap' }}>{replacePlaceholders(template.footer_text, affidavitData)}</p>
                ) : (
                    <p style={{ marginBottom: '25pt' }}>I declare under penalty of perjury that the foregoing is true and correct.</p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>

                    {/* Notary Block (Left) - More Compact */}
                    {include_notary && (
                        <div className="text-sm space-y-4">
                            <div>
                                <div className="border-b border-slate-500 w-48 h-6"></div>
                                <label className="text-slate-600 pt-1 block text-xs">Notary Public</label>
                            </div>
                            <div>
                                <div className="border-b border-slate-500 w-48 h-6"></div>
                                <label className="text-slate-600 pt-1 block text-xs">Date</label>
                            </div>
                            <div>
                                <div className="border-b border-slate-500 w-48 h-6"></div>
                                <label className="text-slate-600 pt-1 block text-xs">Commission Expires</label>
                            </div>
                        </div>
                    )}

                    {/* Signature Block (Right) */}
                    <div className={`flex-shrink-0 ${!include_notary ? 'ml-auto' : ''}`}>
                        <div className="flex gap-6 items-end">
                            <div
                                ref={signatureContainerRef}
                                className="relative border-b border-slate-500 h-10 w-40"
                            >
                                {placedSignature ? (
                                    <img
                                        ref={signatureRef}
                                        src={placedSignature.signature_data}
                                        alt="Signature"
                                        style={{
                                            position: 'absolute',
                                            left: `${signaturePosition.x}px`,
                                            top: `${signaturePosition.y}px`,
                                            width: '140pt', // Adjusted width
                                            height: '30pt', // Adjusted height
                                            cursor: isEditing ? 'move' : 'default',
                                            objectFit: 'contain', // Ensure signature scales within bounds
                                            objectPosition: 'left center', // Align to left
                                        }}
                                        onMouseDown={handleMouseDown}
                                        draggable="false"
                                    />
                                ) : isEditing ? (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={placeSignature}
                                            className="gap-1 text-xs h-6 px-2"
                                        >
                                            <Pencil className="w-3 h-3" />
                                            Sign
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                            <div className="border-b border-slate-500 h-10 w-20 flex items-end pb-1 text-xs">
                                {placedSignature?.signed_date && format(new Date(placedSignature.signed_date), 'MM/dd/yyyy')}
                            </div>
                        </div>
                        <div className="flex gap-6 text-xs mt-1">
                            <div className="w-40 text-center">
                                <div>{server_name}</div>
                                {server_license_number && (
                                    <div className="text-slate-600 text-xs">{server_license_number}</div>
                                )}
                                {include_company_info && affidavitData.company_info && (
                                    <div className="text-slate-600 text-xs mt-2 leading-tight">
                                        {affidavitData.company_info.company_name && (
                                            <div>{affidavitData.company_info.company_name}</div>
                                        )}
                                        {affidavitData.company_info.address1 && (
                                            <div>{affidavitData.company_info.address1}</div>
                                        )}
                                        {affidavitData.company_info.address2 && (
                                            <div>{affidavitData.company_info.address2}</div>
                                        )}
                                        {(affidavitData.company_info.city || affidavitData.company_info.state || affidavitData.company_info.postal_code) && (
                                            <div>
                                                {affidavitData.company_info.city}{affidavitData.company_info.city && affidavitData.company_info.state && ', '}{affidavitData.company_info.state} {affidavitData.company_info.postal_code}
                                            </div>
                                        )}
                                        {affidavitData.company_info.phone && (
                                            <div>{affidavitData.company_info.phone}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="w-20 text-center">Date</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
