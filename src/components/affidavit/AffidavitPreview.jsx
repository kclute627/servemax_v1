
import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { replacePlaceholders, renderHTMLTemplate } from '@/utils/templateEngine';

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

export default function AffidavitPreview({ affidavitData, template, isEditing, onDataChange }) {
    const [user, setUser] = useState(null);
    const [placedSignature, setPlacedSignature] = useState(affidavitData?.placed_signature || null);
    const [isDragging, setIsDragging] = useState(false);
    const [signaturePosition, setSignaturePosition] = useState({ x: 0, y: 2 });
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const signatureRef = useRef(null);
    const signatureContainerRef = useRef(null);

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

    const serviceDate = service_date ? format(new Date(service_date + 'T00:00:00'), 'MMMM d, yyyy') : '';

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

        // If not editing, just render static HTML
        if (!isEditing) {
            return (
                <div
                    style={{
                        width: '612pt',
                        minHeight: '792pt',
                        backgroundColor: '#FFFFFF'
                    }}
                    dangerouslySetInnerHTML={{ __html: renderedHTML }}
                />
            );
        }

        // In edit mode: Parse HTML and make editable fields interactive
        return (
            <div
                style={{
                    width: '612pt',
                    minHeight: '792pt',
                    backgroundColor: '#FFFFFF'
                }}
                className="html-template-editable"
                contentEditable={true}
                suppressContentEditableWarning={true}
                onInput={(e) => {
                    // Capture changes to the HTML content
                    if (onDataChange) {
                        onDataChange('html_content_edited', e.currentTarget.innerHTML);
                    }
                }}
                dangerouslySetInnerHTML={{ __html: renderedHTML }}
            />
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
                            <EditableField value={plaintiff} isEditing={isEditing} onChange={e => handleFieldChange('case_caption', `${e.target.value} v. ${defendant}`)} style={singleLineInputStyle}/>
                        </td>
                        <td style={cellStyle()}>
                            <EditableField value={defendant} isEditing={isEditing} onChange={e => handleFieldChange('case_caption', `${plaintiff} v. ${e.target.value}`)} style={singleLineInputStyle}/>
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
                            <EditableField value={service_manner === 'other' ? service_manner_other : (service_manner ? service_manner.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '')} isEditing={isEditing} onChange={e => handleFieldChange('service_manner', e.target.value)} style={singleLineInputStyle}/>
                        </td>
                    </tr>
                    <tr><td style={cellStyle(true)}>DOCUMENTS</td></tr>
                    <tr>
                        <td style={cellStyle()}>
                            <EditableField as="textarea" value={documents_served && documents_served.length > 0 ? documents_served.map(d => d.title).join('\n') : ''} isEditing={isEditing} onChange={e => handleFieldChange('documents_served', e.target.value.split('\n').filter(Boolean).map(title => ({title})))} />
                        </td>
                    </tr>
                    <tr><td style={cellStyle(true)}>DATE OF SERVICE</td></tr>
                    <tr>
                        <td style={cellStyle()}>
                            <EditableField
                                value={`${serviceDate} at approximately ${service_time || ''}`}
                                isEditing={isEditing}
                                onChange={() => {}} // This field is for display, not direct edit
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
