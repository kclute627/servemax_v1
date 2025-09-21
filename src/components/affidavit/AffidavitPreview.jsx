
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { User } from '@/api/entities';
import SignatureButton from './SignatureButton';

const EditableField = ({ value, isEditing, onChange, as = 'input', className = '' }) => {
  if (!isEditing) {
    return <div className={`text-sm text-slate-800 font-medium break-words ${className}`}>{value || <span className="text-slate-400">N/A</span>}</div>;
  }
  
  const commonProps = {
    value: value || '',
    onChange: onChange,
    className: `text-sm p-1 bg-blue-50/50 border border-blue-300 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`
  };

  if (as === 'textarea') {
    return <Textarea {...commonProps} rows={3} />;
  }
  
  return <Input {...commonProps} />;
};

const Field = ({ label, children, className = '' }) => (
    <div className={`py-2 px-3 ${className}`}>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
        {children}
    </div>
);

export default function AffidavitPreview({ affidavitData, isEditing, onDataChange }) {
    const [user, setUser] = useState(null);
    const [placedSignature, setPlacedSignature] = useState(affidavitData?.placed_signature || null);
    const [signaturePosition, setSignaturePosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const signatureRef = useRef(null);
    const signatureContainerRef = useRef(null);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
            } catch (error) {
                console.error('Error loading user:', error);
            }
        };
        loadUser();
    }, []);

    // Update placedSignature if affidavitData.placed_signature changes externally
    useEffect(() => {
        setPlacedSignature(affidavitData?.placed_signature || null);
    }, [affidavitData?.placed_signature]);

    // Clear signature when entering edit mode
    useEffect(() => {
        if (isEditing && placedSignature) {
            setPlacedSignature(null);
            onDataChange('placed_signature', null);
            setSignaturePosition({ x: 0, y: 0 });
        }
    }, [isEditing, placedSignature, onDataChange]);

    // Mouse event handlers
    const handleMouseMove = useCallback((e) => {
        if (!isDragging || !signatureContainerRef.current) return;
        
        const containerRect = signatureContainerRef.current.getBoundingClientRect();
        const newX = e.clientX - containerRect.left - dragOffset.x;
        const newY = e.clientY - containerRect.top - dragOffset.y;
        
        // Constrain within container bounds - allow more downward movement
        const maxX = containerRect.width - 120; // signature width
        const maxY = containerRect.height - 20; // allow signature to go lower
        
        setSignaturePosition({
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(-10, Math.min(newY, maxY)) // allow going higher and lower
        });
    }, [isDragging, dragOffset]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    if (!affidavitData) return null;

    const {
        document_title,
        court_name, court_county, case_number, case_caption,
        documents_served, service_date, service_time, service_address,
        service_manner, service_manner_other,
        person_served_name, person_relationship,
        server_name,
        job
    } = affidavitData;

    const plaintiff = case_caption?.split('v.')[0]?.trim() || '';
    const defendant = case_caption?.split('v.')[1]?.trim() || '';
    
    const serviceDate = service_date ? format(new Date(service_date + 'T00:00:00'), 'MMMM d, yyyy') : '';
    
    const handleFieldChange = (field, value) => {
        onDataChange(field, value);
    };

    const handleSignaturePlace = (signatureData) => {
        setPlacedSignature(signatureData);
        onDataChange('placed_signature', signatureData);
        setSignaturePosition({ x: 0, y: 16 }); // Start signature even lower
    };

    const handleMouseDown = (e) => {
        if (!placedSignature || isEditing || !signatureRef.current || !signatureContainerRef.current) return;
        
        setIsDragging(true);
        const signatureRect = signatureRef.current.getBoundingClientRect();
        
        setDragOffset({
            x: e.clientX - signatureRect.left,
            y: e.clientY - signatureRect.top
        });
    };

    return (
        <div className={`p-10 font-serif ${isEditing ? 'outline-dashed outline-2 outline-blue-400' : ''}`}>
            {/* Editable Document Title */}
            {isEditing ? (
                <div className="mb-8">
                    <EditableField 
                        value={document_title} 
                        isEditing={isEditing} 
                        onChange={e => handleFieldChange('document_title', e.target.value)} 
                        className="text-xl font-bold text-center text-slate-800 tracking-wider bg-slate-100 p-3 rounded"
                    />
                </div>
            ) : (
                <h1 className="text-xl font-bold text-center text-slate-800 tracking-wider mb-8 bg-slate-100 p-3 rounded">
                    {document_title}
                </h1>
            )}

            {/* Case Info Table */}
            <div className="border border-slate-300 grid grid-cols-2">
                <Field label="Case Number">
                    <EditableField value={case_number} isEditing={isEditing} onChange={e => handleFieldChange('case_number', e.target.value)} />
                </Field>
                <Field label="Court">
                    <EditableField value={`${court_name || ''}, ${court_county || ''}`} isEditing={isEditing} onChange={e => {
                        const parts = e.target.value.split(',');
                        handleFieldChange('court_name', parts[0] ? parts[0].trim() : '');
                        handleFieldChange('court_county', parts[1] ? parts[1].trim() : '');
                    }} />
                </Field>
                <Field label="Plaintiff / Petitioner" className="border-t">
                    <EditableField value={plaintiff} isEditing={isEditing} onChange={e => handleFieldChange('case_caption', `${e.target.value} v. ${defendant}`)} />
                </Field>
                <Field label="Defendant / Respondent" className="border-t">
                    <EditableField value={defendant} isEditing={isEditing} onChange={e => handleFieldChange('case_caption', `${plaintiff} v. ${e.target.value}`)} />
                </Field>
            </div>

            <div className="mt-8">
                <p className="text-sm leading-relaxed text-slate-700">
                    I, <EditableField value={server_name} isEditing={isEditing} onChange={e => handleFieldChange('server_name', e.target.value)} className="inline-block w-48" />, being duly sworn, depose and say: I am over the age of 18 years and not a party to this action, and that within the boundaries of the state where service was effected, I was authorized by law to make service of the documents and informed said person of the contents herein.
                </p>
            </div>

            {/* Service Details Table */}
            <div className="mt-8 border border-slate-300 grid grid-cols-1">
                <Field label="Recipient Name / Address">
                    <EditableField 
                        value={`${affidavitData.recipient_name || ''}\n${service_address || ''}`} 
                        isEditing={isEditing} 
                        onChange={e => {
                           const parts = e.target.value.split('\n');
                           handleFieldChange('recipient_name', parts[0] || '');
                           handleFieldChange('service_address', parts.slice(1).join('\n'));
                        }} 
                        as="textarea" 
                    />
                </Field>
                <Field label="Manner of Service" className="border-t">
                    <EditableField 
                        value={service_manner === 'other' ? service_manner_other : (service_manner ? service_manner.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '')} 
                        isEditing={isEditing} 
                        onChange={e => handleFieldChange('service_manner', e.target.value)} 
                    />
                </Field>
                <Field label="Documents" className="border-t">
                    <EditableField 
                        value={documents_served && documents_served.length > 0 ? documents_served.map(d => d.title).join('\n') : ''} 
                        isEditing={isEditing} 
                        onChange={e => handleFieldChange('documents_served', e.target.value.split('\n').filter(Boolean).map(title => ({title})))} 
                        as="textarea" 
                    />
                </Field>
                <Field label="Date of Service" className="border-t">
                    <EditableField value={`${serviceDate} at approximately ${service_time || ''}`} isEditing={isEditing} onChange={e => {
                        // Simplified update, more complex date/time input would be needed for full edit
                    }} />
                </Field>
            </div>

            {/* Declaration and Signature */}
            <div className="mt-16 grid grid-cols-2 gap-8 items-end">
                <div>
                    <p className="text-sm text-slate-600">I declare under penalty of perjury that the foregoing is true and correct.</p>
                </div>
                <div>
                    <div className="flex items-end gap-6">
                        <div className="flex-grow text-center">
                            <div 
                                ref={signatureContainerRef}
                                className="border-b border-slate-400 pb-2 mb-2 relative h-20 flex items-end justify-center"
                            >
                                {placedSignature && (
                                    <img 
                                        ref={signatureRef}
                                        src={placedSignature.signature_data} 
                                        alt="Signature" 
                                        className="max-h-16 max-w-48 object-contain absolute cursor-move"
                                        style={{ 
                                            left: `${signaturePosition.x}px`, 
                                            top: `${signaturePosition.y}px`,
                                            backgroundColor: 'transparent',
                                            mixBlendMode: 'multiply'
                                        }}
                                        onMouseDown={handleMouseDown}
                                        draggable={false}
                                    />
                                )}
                                <SignatureButton 
                                    user={user} 
                                    onSignaturePlace={handleSignaturePlace}
                                    className="absolute -right-8 top-0"
                                    isEditing={isEditing}
                                />
                            </div>
                            <p className="text-sm text-slate-600 mt-1">{server_name}</p>
                        </div>
                        <div className="w-32 text-center">
                            <div className="border-b border-slate-400 pb-2 mb-2 h-20 flex items-end justify-center">
                                {placedSignature?.signed_date && (
                                    <span className="text-sm text-slate-800 mb-1">
                                        {format(new Date(placedSignature.signed_date), 'MM/dd/yyyy')}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm font-medium text-slate-700">Date</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
