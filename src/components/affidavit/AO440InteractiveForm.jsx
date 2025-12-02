import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Pencil, X } from 'lucide-react';

export default function AO440InteractiveForm({ affidavitData, onDataChange, isEditing }) {
  const [user, setUser] = useState(null);
  const [placedSignature, setPlacedSignature] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [signaturePosition, setSignaturePosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [signatureDate, setSignatureDate] = useState('');
  const [signatureSize, setSignatureSize] = useState({ width: 270, height: 52.5 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartSize, setResizeStartSize] = useState(null);
  const [resizeStartPos, setResizeStartPos] = useState(null);
  const [showResizeHandles, setShowResizeHandles] = useState(false);

  const signatureRef = useRef(null);
  const signatureContainerRef = useRef(null);

  // Load user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const u = await User.me();
        setUser(u);
      } catch (e) {
        console.error("User not found", e);
      }
    };
    fetchUser();
  }, []);

  // Initialize signature from affidavitData
  useEffect(() => {
    console.log('[AO440InteractiveForm] Signature initialization useEffect:');
    console.log('  affidavitData.placed_signature:', affidavitData?.placed_signature);

    if (affidavitData?.placed_signature) {
      console.log('  Setting placedSignature state from affidavitData');
      setPlacedSignature(affidavitData.placed_signature);

      if (affidavitData.placed_signature.position) {
        console.log('  Setting position:', affidavitData.placed_signature.position);
        setSignaturePosition(affidavitData.placed_signature.position);
      }
      if (affidavitData.placed_signature.size) {
        console.log('  Setting size:', affidavitData.placed_signature.size);
        setSignatureSize(affidavitData.placed_signature.size);
      }
      if (affidavitData.placed_signature.signed_date) {
        const date = new Date(affidavitData.placed_signature.signed_date);
        const formatted = format(date, 'MM/dd/yyyy');
        console.log('  Setting signatureDate:', formatted);
        setSignatureDate(formatted);
      }
    } else {
      console.log('  No placed_signature in affidavitData, clearing state');
    }
  }, [affidavitData]);

  // Handle mouse drag for signature repositioning and resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && signatureContainerRef.current) {
        const containerRect = signatureContainerRef.current.getBoundingClientRect();

        let newX = e.clientX - containerRect.left - dragOffset.x;
        let newY = e.clientY - containerRect.top - dragOffset.y;

        // Constrain within container bounds (use current signature size)
        newX = Math.max(0, Math.min(newX, containerRect.width - signatureSize.width));
        newY = Math.max(-10, Math.min(newY, containerRect.height - signatureSize.height));

        setSignaturePosition({ x: newX, y: newY });
      } else if (isResizing && resizeStartPos && resizeStartSize) {
        // Calculate resize delta
        const deltaX = e.clientX - resizeStartPos.x;

        // Maintain aspect ratio (width to height ratio is 5.14:1)
        const aspectRatio = 5.14;
        let newWidth = resizeStartSize.width + deltaX;

        // Apply size constraints
        newWidth = Math.max(50, Math.min(400, newWidth));
        const newHeight = newWidth / aspectRatio;

        setSignatureSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Save updated position
        if (onDataChange && placedSignature) {
          onDataChange('placed_signature', {
            ...placedSignature,
            position: signaturePosition,
            size: signatureSize
          });
        }
      } else if (isResizing) {
        setIsResizing(false);
        setResizeStartPos(null);
        setResizeStartSize(null);
        // Save updated size
        if (onDataChange && placedSignature) {
          onDataChange('placed_signature', {
            ...placedSignature,
            position: signaturePosition,
            size: signatureSize
          });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, placedSignature, signaturePosition, signatureSize, onDataChange, resizeStartPos, resizeStartSize]);

  // Auto-generate attempts list for additional information section
  useEffect(() => {
    const attempts = affidavitData?.attempts;

    // Only generate if we have attempts and additional_info is empty or is the default single-attempt notes
    if (!attempts || attempts.length === 0) return;

    // Check if additional_info is empty or just has the latest attempt's notes
    const currentInfo = affidavitData?.additional_info || '';

    // Generate formatted attempts list (compact single-line format)
    const formattedAttempts = attempts
      .sort((a, b) => new Date(a.attempt_date) - new Date(b.attempt_date)) // Sort chronologically
      .map((attempt, index) => {
        const attemptNumber = index + 1;
        const attemptDate = attempt.attempt_date ? format(new Date(attempt.attempt_date), 'MMM d, yyyy h:mm a') : 'Date not recorded';
        const address = attempt.address_of_attempt || 'No address recorded';
        const personServed = attempt.person_served_name || 'N/A';
        const serviceType = attempt.service_type_detail || 'N/A';

        // Build single line with conditional parts
        let line = `ATTEMPT #${attemptNumber} - ${attemptDate} | ${serviceType} | ${address} | Person Served: ${personServed}`;

        // Add GPS if available
        if (attempt.gps_lat && attempt.gps_lon) {
          line += ` | GPS: ${attempt.gps_lat},${attempt.gps_lon}`;
        }

        // Add notes only if they exist and aren't empty/default
        if (attempt.notes && attempt.notes.trim() !== '' && attempt.notes !== 'No additional notes') {
          line += ` | Notes: ${attempt.notes}`;
        }

        return line;
      })
      .join('\n');

    // Only update if additional_info is empty or hasn't been manually edited
    // We'll check if it's empty or equals a single attempt's notes
    if (!currentInfo || currentInfo.trim() === '' || currentInfo === (attempts[attempts.length - 1]?.notes || '')) {
      if (onDataChange && formattedAttempts) {
        onDataChange('additional_info', formattedAttempts);
      }
    }
  }, [affidavitData?.attempts, onDataChange]);

  if (!affidavitData) return null;

  // DEBUG LOGGING
  console.log('[AO440InteractiveForm] Component render:');
  console.log('  isEditing:', isEditing);
  console.log('  affidavitData.placed_signature:', affidavitData.placed_signature ? 'EXISTS' : 'NULL');
  console.log('  affidavitData.service_date:', affidavitData.service_date);
  console.log('  Local placedSignature state:', placedSignature ? 'EXISTS' : 'NULL');
  console.log('  Local signatureDate state:', signatureDate);

  const {
    case_number = '',
    recipient_name = '',
    date_received = '',
    service_method = 'personal',
    service_place = '',
    service_date = '',
    residence_person = '',
    residence_person_name = '',
    residence_date = '',
    residence_address = '',
    organization_agent = '',
    organization_name = '',
    organization_date = '',
    unexecuted_recipient = '',
    unexecuted_reason = '',
    other_recipient = '',
    other_description = '',
    other_details = '',
    travel_fee = '',
    service_fee = '',
    total_fee = '0.00',
    server_name = '',
    server_name_and_title = '',
    server_address = '',
    additional_info = ''
  } = affidavitData;

  const handleChange = (field, value) => {
    if (onDataChange) {
      onDataChange(field, value);
    }
  };

  const handleServiceMethodChange = (method) => {
    handleChange('service_method', method);
  };

  // Calculate total fee whenever travel or service fee changes
  const handleFeeChange = (field, value) => {
    const newValue = value === '' ? '' : value;
    handleChange(field, newValue);

    const travelFeeNum = field === 'travel_fee' ? parseFloat(newValue) || 0 : parseFloat(travel_fee) || 0;
    const serviceFeeNum = field === 'service_fee' ? parseFloat(newValue) || 0 : parseFloat(service_fee) || 0;
    const total = (travelFeeNum + serviceFeeNum).toFixed(2);
    handleChange('total_fee', total);
  };

  // Place signature on the form (works in both edit and view mode)
  const placeSignature = () => {
    console.log('[AO440InteractiveForm] placeSignature called');

    if (!user || !user.e_signature?.signature_data || placedSignature) {
      console.log('  Signature placement blocked:', {
        hasUser: !!user,
        hasEsignature: !!user?.e_signature?.signature_data,
        alreadyPlaced: !!placedSignature
      });
      return;
    }

    const now = new Date();
    const defaultSize = { width: 270, height: 52.5 };
    const signatureDataToPlace = {
      signature_data: user.e_signature.signature_data,
      signed_date: now.toISOString(),
      position: { x: 0, y: 0 },
      size: defaultSize
    };

    console.log('  Placing signature:', signatureDataToPlace);
    setPlacedSignature(signatureDataToPlace);
    setSignaturePosition({ x: 0, y: 0 });
    setSignatureSize(defaultSize);

    // Auto-fill the date field
    const formattedDate = format(now, 'MM/dd/yyyy');
    console.log('  Setting signatureDate:', formattedDate);
    setSignatureDate(formattedDate);

    // Save to affidavitData
    if (onDataChange) {
      console.log('  Calling onDataChange with placed_signature');
      onDataChange('placed_signature', signatureDataToPlace);
    }
  };

  // Clear signature (works in both edit and view mode)
  const clearSignature = () => {
    setPlacedSignature(null);
    setSignaturePosition({ x: 0, y: 0 });
    setSignatureDate('');

    if (onDataChange) {
      onDataChange('placed_signature', null);
    }
  };

  // Handle mouse down on signature for dragging (works in both edit and view mode)
  const handleMouseDown = (e) => {
    if (!placedSignature || !signatureRef.current) return;

    setIsDragging(true);
    const signatureRect = signatureRef.current.getBoundingClientRect();

    setDragOffset({
      x: e.clientX - signatureRect.left,
      y: e.clientY - signatureRect.top
    });
  };

  // Handle resize start (works in both edit and view mode)
  const handleResizeStart = (e, corner) => {
    if (!placedSignature) return;

    e.stopPropagation(); // Prevent triggering drag
    setIsResizing(true);
    setResizeStartPos({ x: e.clientX, y: e.clientY });
    setResizeStartSize({ ...signatureSize });
  };

  // Format date for display
  const formatDateValue = (dateValue) => {
    if (!dateValue) return '';
    try {
      return format(new Date(dateValue), 'MMM d, yyyy, h:mm a');
    } catch {
      return dateValue;
    }
  };

  // Editable text input styled to look like part of the form
  const EditableUnderline = ({ value, onChange, minWidth = '180pt', placeholder = '', type = 'text' }) => {
    if (!isEditing) {
      return (
        <span style={{
          borderBottom: '1pt solid #000',
          display: 'inline-block',
          minWidth,
          paddingBottom: '1pt'
        }}>
          {value || '\u00A0'}
        </span>
      );
    }

    return (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          borderBottom: '1pt solid #000',
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          display: 'inline-block',
          minWidth,
          padding: '0 2pt 1pt 2pt',
          fontFamily: 'Times New Roman, Times, serif',
          fontSize: '13pt',
          lineHeight: '1.5',
          backgroundColor: isEditing ? '#FFF9E6' : 'transparent',
          outline: 'none',
        }}
      />
    );
  };

  // Editable checkbox
  const EditableCheckbox = ({ checked, onChange }) => {
    const checkboxChar = checked ? '☑' : '☐';

    if (!isEditing) {
      return (
        <div style={{
          width: '22pt',
          flexShrink: 0,
          fontSize: '18pt',
          fontFamily: 'Arial, sans-serif'
        }}>
          {checkboxChar}
        </div>
      );
    }

    return (
      <div style={{
        width: '22pt',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer'
      }}
      onClick={onChange}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          style={{
            width: '18pt',
            height: '18pt',
            cursor: 'pointer',
            accentColor: '#000'
          }}
        />
      </div>
    );
  };

  return (
    <div style={{
      width: '612pt',
      padding: '24pt 36pt',
      fontFamily: 'Times New Roman, Times, serif',
      fontSize: '13pt',
      lineHeight: '1.5',
      color: '#000000',
      backgroundColor: '#FFFFFF',
      boxSizing: 'border-box'
    }}>
      {/* Header Line */}
      <div style={{ fontSize: '10pt', marginBottom: '0pt', lineHeight: '1.2' }}>
        AO 440 (Rev. 06/12) Summons in a Civil Action (Page 2)
      </div>
      <div style={{ fontSize: '10pt', marginBottom: '12pt', lineHeight: '1.2' }}>
        Civil Action No. <EditableUnderline
          value={case_number}
          onChange={(val) => handleChange('case_number', val)}
          minWidth="150pt"
          placeholder="Enter case number"
        />
      </div>

      {/* Title Section */}
      <div style={{ textAlign: 'center', marginBottom: '12pt' }}>
        <div style={{ fontWeight: 'bold', fontSize: '12pt', marginBottom: '0pt', lineHeight: '1.2' }}>
          PROOF OF SERVICE
        </div>
        <div style={{ fontSize: '10pt', fontStyle: 'italic', lineHeight: '1.2' }}>
          (This section should not be filed with the court unless required by Fed. R. Civ. P. 4 (l))
        </div>
      </div>

      {/* Opening Statement */}
      <p style={{ margin: '12pt 0', lineHeight: '1.4' }}>
        This summons for <i>(name of individual and title, if any)</i>{' '}
        <EditableUnderline
          value={recipient_name}
          onChange={(val) => handleChange('recipient_name', val)}
          minWidth="180pt"
          placeholder="Enter recipient name"
        />
        {' '}was received by me on <i>(date)</i>{' '}
        <EditableUnderline
          value={isEditing ? date_received : formatDateValue(date_received)}
          onChange={(val) => handleChange('date_received', val)}
          minWidth="150pt"
          placeholder="MM/DD/YYYY"
          type={isEditing ? "date" : "text"}
        />.
      </p>

      {/* Checkbox Options */}
      <div style={{ marginBottom: '15pt' }}>
        {/* Option 1: Personal Service */}
        <div style={{ display: 'flex', marginBottom: '12pt', lineHeight: '1.5' }}>
          <EditableCheckbox
            checked={service_method === 'personal'}
            onChange={() => handleServiceMethodChange('personal')}
          />
          <div style={{ flex: 1 }}>
            {(() => {
              // DEBUG: Log service date rendering
              const serviceDateValue = !isEditing ? formatDateValue(service_date) : (service_method === 'personal' ? service_date : '');
              console.log('[AO440InteractiveForm] Service date field render for Personal Service:', {
                isEditing,
                service_method,
                service_date,
                serviceDateValue,
                willShowDatePicker: isEditing && service_method === 'personal'
              });
              return null;
            })()}
            I personally served the summons on the individual at <i>(place)</i>{' '}
            <EditableUnderline
              value={service_method === 'personal' ? service_place : ''}
              onChange={(val) => handleChange('service_place', val)}
              minWidth="180pt"
              placeholder={service_method === 'personal' ? "Enter place of service" : ""}
            />
            {' '}on <i>(date)</i>{' '}
            <EditableUnderline
              value={service_method === 'personal' ? (isEditing ? (service_date ? service_date.split('T')[0] : '') : formatDateValue(service_date)) : ''}
              onChange={(val) => handleChange('service_date', val)}
              minWidth="120pt"
              placeholder={service_method === 'personal' ? "MM/DD/YYYY" : ""}
              type={isEditing && service_method === 'personal' ? "date" : "text"}
            />; or
          </div>
        </div>

        {/* Option 2: Left at Residence */}
        <div style={{ display: 'flex', marginBottom: '12pt', lineHeight: '1.5' }}>
          <EditableCheckbox
            checked={service_method === 'residence'}
            onChange={() => handleServiceMethodChange('residence')}
          />
          <div style={{ flex: 1 }}>
            I left the summons at the individual's residence or usual place of abode with <i>(name)</i>{' '}
            <EditableUnderline
              value={service_method === 'residence' ? (residence_person_name || residence_person) : ''}
              onChange={(val) => {
                handleChange('residence_person', val);
                handleChange('residence_person_name', val);
              }}
              minWidth="120pt"
              placeholder={service_method === 'residence' ? "Person's name" : ""}
            />
            , a person of suitable age and discretion who resides there, on <i>(date)</i>{' '}
            <EditableUnderline
              value={service_method === 'residence' ? (isEditing ? (residence_date ? residence_date.split('T')[0] : '') : formatDateValue(residence_date)) : ''}
              onChange={(val) => handleChange('residence_date', val)}
              minWidth="100pt"
              placeholder={service_method === 'residence' ? "MM/DD/YYYY" : ""}
              type={isEditing && service_method === 'residence' ? "date" : "text"}
            />
            , and mailed a copy to the individual's last known address; or
          </div>
        </div>

        {/* Option 3: Served on Organization */}
        <div style={{ display: 'flex', marginBottom: '12pt', lineHeight: '1.5' }}>
          <EditableCheckbox
            checked={service_method === 'organization'}
            onChange={() => handleServiceMethodChange('organization')}
          />
          <div style={{ flex: 1 }}>
            I served the summons on <i>(name of individual)</i>{' '}
            <EditableUnderline
              value={service_method === 'organization' ? organization_agent : ''}
              onChange={(val) => handleChange('organization_agent', val)}
              minWidth="140pt"
              placeholder={service_method === 'organization' ? "Agent name" : ""}
            />
            , who is designated by law to accept service of process on behalf of <i>(name of organization)</i>{' '}
            <EditableUnderline
              value={service_method === 'organization' ? organization_name : ''}
              onChange={(val) => handleChange('organization_name', val)}
              minWidth="180pt"
              placeholder={service_method === 'organization' ? "Organization name" : ""}
            />
            {' '}on <i>(date)</i>{' '}
            <EditableUnderline
              value={service_method === 'organization' ? (isEditing ? (organization_date ? organization_date.split('T')[0] : '') : formatDateValue(organization_date)) : ''}
              onChange={(val) => handleChange('organization_date', val)}
              minWidth="120pt"
              placeholder={service_method === 'organization' ? "MM/DD/YYYY" : ""}
              type={isEditing && service_method === 'organization' ? "date" : "text"}
            />; or
          </div>
        </div>

        {/* Option 4: Returned Unexecuted */}
        <div style={{ display: 'flex', marginBottom: '12pt', lineHeight: '1.5' }}>
          <EditableCheckbox
            checked={service_method === 'unexecuted'}
            onChange={() => handleServiceMethodChange('unexecuted')}
          />
          <div style={{ flex: 1 }}>
            I returned the summons unexecuted because:{' '}
            <EditableUnderline
              value={service_method === 'unexecuted' ? unexecuted_reason : ''}
              onChange={(val) => handleChange('unexecuted_reason', val)}
              minWidth="240pt"
              placeholder={service_method === 'unexecuted' ? "Reason for non-service" : ""}
            />; or
          </div>
        </div>

        {/* Option 5: Other */}
        <div style={{ display: 'flex', marginBottom: '12pt', lineHeight: '1.5' }}>
          <EditableCheckbox
            checked={service_method === 'other'}
            onChange={() => handleServiceMethodChange('other')}
          />
          <div style={{ flex: 1 }}>
            Other:{' '}
            <EditableUnderline
              value={service_method === 'other' ? (other_details || other_description) : ''}
              onChange={(val) => {
                handleChange('other_details', val);
                handleChange('other_description', val);
              }}
              minWidth="340pt"
              placeholder={service_method === 'other' ? "Describe other service method" : ""}
            />
          </div>
        </div>
      </div>

      {/* Fees Section */}
      <p style={{ margin: '12pt 0', lineHeight: '1.4' }}>
        My fees are $
        <EditableUnderline
          value={travel_fee}
          onChange={(val) => handleFeeChange('travel_fee', val)}
          minWidth="60pt"
          placeholder="0.00"
          type="number"
        />
        {' '}for travel and $
        <EditableUnderline
          value={service_fee}
          onChange={(val) => handleFeeChange('service_fee', val)}
          minWidth="60pt"
          placeholder="0.00"
          type="number"
        />
        {' '}for services, for a total of $
        <EditableUnderline
          value={total_fee}
          onChange={(val) => handleChange('total_fee', val)}
          minWidth="60pt"
          placeholder="0.00"
          type="number"
        />.
      </p>

      {/* Declaration */}
      <p style={{ margin: '12pt 0', lineHeight: '1.4' }}>
        I declare under penalty of perjury that this information is true.
      </p>

      {/* Signature Section - Exact AO 440 Format */}
      <div style={{ marginTop: '24pt' }}>
        {/* First Row: Date and Server's Signature on SAME LINE */}
        <div style={{ display: 'flex', gap: '40pt', alignItems: 'flex-end', marginBottom: '1pt' }}>
          {/* Date */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8pt', flex: '0 0 120pt' }}>
            <span style={{ fontSize: '13pt' }}>Date:</span>
            <div style={{ borderBottom: '1pt solid #000', width: '80pt', height: '18pt', marginBottom: '1pt', display: 'flex', alignItems: 'flex-end', paddingBottom: '1pt' }}>
              <span style={{ fontSize: '11pt' }}>
                {signatureDate || (affidavitData?.placed_signature?.signed_date ? format(new Date(affidavitData.placed_signature.signed_date), 'MM/dd/yyyy') : '')}
              </span>
            </div>
          </div>
          {/* Server's Signature Line */}
          <div
            ref={signatureContainerRef}
            style={{
              flex: 1,
              paddingRight: '0px',
              position: 'relative',
              borderBottom: '1pt solid #000',
              minHeight: '40pt',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {(placedSignature || affidavitData?.placed_signature) ? (
              <>
                <div
                  style={{
                    position: 'absolute',
                    left: `${signaturePosition.x}px`,
                    top: `${signaturePosition.y}px`,
                    width: `${signatureSize.width}pt`,
                    height: `${signatureSize.height}pt`,
                    border: '2px dashed #3B82F6',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                  }}
                  onMouseEnter={() => setShowResizeHandles(true)}
                  onMouseLeave={() => !isDragging && !isResizing && setShowResizeHandles(false)}
                >
                  <img
                    ref={signatureRef}
                    src={(placedSignature || affidavitData?.placed_signature)?.signature_data}
                    alt="Signature"
                    style={{
                      width: '100%',
                      height: '100%',
                      cursor: isDragging ? 'grabbing' : 'grab',
                      objectFit: 'contain',
                      objectPosition: 'left center',
                    }}
                    onMouseDown={handleMouseDown}
                    draggable="false"
                  />

                  {/* Resize Handles - show when hovering or actively resizing */}
                  {(showResizeHandles || isResizing) && (
                    <>
                      {/* Top-left corner */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '-4pt',
                          top: '-4pt',
                          width: '10pt',
                          height: '10pt',
                          backgroundColor: '#3B82F6',
                          borderRadius: '2px',
                          cursor: 'nwse-resize',
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'tl')}
                      />
                      {/* Top-right corner */}
                      <div
                        style={{
                          position: 'absolute',
                          right: '-4pt',
                          top: '-4pt',
                          width: '10pt',
                          height: '10pt',
                          backgroundColor: '#3B82F6',
                          borderRadius: '2px',
                          cursor: 'nesw-resize',
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'tr')}
                      />
                      {/* Bottom-left corner */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '-4pt',
                          bottom: '-4pt',
                          width: '10pt',
                          height: '10pt',
                          backgroundColor: '#3B82F6',
                          borderRadius: '2px',
                          cursor: 'nesw-resize',
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'bl')}
                      />
                      {/* Bottom-right corner */}
                      <div
                        style={{
                          position: 'absolute',
                          right: '-4pt',
                          bottom: '-4pt',
                          width: '10pt',
                          height: '10pt',
                          backgroundColor: '#3B82F6',
                          borderRadius: '2px',
                          cursor: 'nwse-resize',
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'br')}
                      />
                    </>
                  )}

                  {/* Remove button on signature */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSignature();
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
                      zIndex: 20
                    }}
                    title="Remove Signature"
                  >
                    <X size={12} />
                  </button>
                </div>
              </>
            ) : user?.e_signature?.signature_data ? (
              <Button
                variant="outline"
                size="sm"
                onClick={placeSignature}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Pencil className="w-4 h-4" />
                Sign Affidavit
              </Button>
            ) : null}
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '10pt', fontStyle: 'italic', marginBottom: '8pt', paddingLeft: '120pt', paddingRight: '0px' }}>
          Server's signature
        </div>

        {/* Printed Name and Title */}
        <div style={{ display: 'flex', gap: '40pt' }}>
          <div style={{ flex: '0 0 120pt' }}></div>
          <div style={{ flex: 1, paddingRight: '0px' }}>
            <div style={{ borderBottom: '1pt solid #000', width: '100%', minHeight: '18pt', marginBottom: '1pt', display: 'flex', alignItems: 'flex-end', paddingBottom: '1pt' }}>
              {isEditing ? (
                <input
                  type="text"
                  value={server_name_and_title || server_name}
                  onChange={(e) => handleChange('server_name_and_title', e.target.value)}
                  placeholder="Your name and title"
                  style={{
                    border: 'none',
                    width: '100%',
                    fontSize: '11pt',
                    fontFamily: 'Times New Roman, Times, serif',
                    backgroundColor: '#FFF9E6',
                    outline: 'none',
                    padding: '0 2pt'
                  }}
                />
              ) : (
                <span style={{ fontSize: '11pt' }}>{server_name_and_title || server_name}</span>
              )}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '10pt', fontStyle: 'italic', marginBottom: '8pt', paddingLeft: '120pt', paddingRight: '0px' }}>
          Printed name and title
        </div>

        {/* Server's Address */}
        <div style={{ display: 'flex', gap: '40pt' }}>
          <div style={{ flex: '0 0 120pt' }}></div>
          <div style={{ flex: 1, paddingRight: '0px' }}>
            <div style={{ borderBottom: '1pt solid #000', width: '100%', minHeight: '18pt', marginBottom: '1pt', display: 'flex', alignItems: 'flex-end', paddingBottom: '1pt' }}>
              {isEditing ? (
                <input
                  type="text"
                  value={server_address}
                  onChange={(e) => handleChange('server_address', e.target.value)}
                  placeholder="Your address"
                  style={{
                    border: 'none',
                    width: '100%',
                    fontSize: '11pt',
                    fontFamily: 'Times New Roman, Times, serif',
                    backgroundColor: '#FFF9E6',
                    outline: 'none',
                    padding: '0 2pt'
                  }}
                />
              ) : (
                <span style={{ fontSize: '11pt' }}>{server_address}</span>
              )}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '10pt', fontStyle: 'italic', marginBottom: '8pt', paddingLeft: '120pt', paddingRight: '0px' }}>
          Server's address
        </div>
      </div>

      {/* Additional Information Section */}
      <div style={{ marginTop: '8pt', lineHeight: '1.2' }}>
        <div style={{ fontWeight: 'normal', marginBottom: '4pt', fontSize: '13pt' }}>
          Additional information regarding attempted service, etc:
        </div>
        {isEditing ? (
          <textarea
            value={additional_info}
            onChange={(e) => handleChange('additional_info', e.target.value)}
            placeholder="Enter any additional information about the service attempt"
            style={{
              width: '100%',
              minHeight: '120pt',
              border: '1pt solid #ccc',
              borderRadius: '2pt',
              padding: '4pt',
              fontFamily: 'Times New Roman, Times, serif',
              fontSize: '10pt',
              lineHeight: '1.2',
              backgroundColor: '#FFF9E6',
              resize: 'none'
            }}
          />
        ) : (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.2', minHeight: '120pt', fontSize: '10pt' }}>{additional_info}</div>
        )}
      </div>
    </div>
  );
}
