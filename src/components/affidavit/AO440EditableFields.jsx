import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format } from 'date-fns';

export default function AO440EditableFields({ affidavitData, onDataChange, isEditing }) {
  // Local state for form fields
  const [serviceMethod, setServiceMethod] = useState(affidavitData?.service_method || 'personal');
  const [caseNumber, setCaseNumber] = useState(affidavitData?.case_number || '');

  // Personal service fields
  const [recipientName, setRecipientName] = useState(affidavitData?.recipient_name || '');
  const [dateReceived, setDateReceived] = useState(affidavitData?.date_received || '');
  const [servicePlace, setServicePlace] = useState(affidavitData?.service_place || '');

  // Residence/dwelling fields
  const [residenceRecipient, setResidenceRecipient] = useState(affidavitData?.residence_recipient || '');
  const [residencePersonName, setResidencePersonName] = useState(affidavitData?.residence_person_name || '');
  const [residenceDate, setResidenceDate] = useState(affidavitData?.residence_date || '');
  const [residenceAddress, setResidenceAddress] = useState(affidavitData?.residence_address || '');
  const [residenceRelationship, setResidenceRelationship] = useState(affidavitData?.residence_relationship || '');
  const [residenceAge, setResidenceAge] = useState(affidavitData?.residence_age || '');

  // Organization fields
  const [organizationAgent, setOrganizationAgent] = useState(affidavitData?.organization_agent || '');
  const [organizationName, setOrganizationName] = useState(affidavitData?.organization_name || '');
  const [organizationDate, setOrganizationDate] = useState(affidavitData?.organization_date || '');

  // Unexecuted/Not served fields
  const [unexecutedRecipient, setUnexecutedRecipient] = useState(affidavitData?.unexecuted_recipient || '');
  const [unexecutedReason, setUnexecutedReason] = useState(affidavitData?.unexecuted_reason || '');

  // Other method fields
  const [otherRecipient, setOtherRecipient] = useState(affidavitData?.other_recipient || '');
  const [otherDescription, setOtherDescription] = useState(affidavitData?.other_description || '');

  // Server information
  const [serverName, setServerName] = useState(affidavitData?.server_name || '');
  const [serverAddress, setServerAddress] = useState(affidavitData?.server_address || '');

  // Fee information
  const [travelFee, setTravelFee] = useState(affidavitData?.travel_fee || '0.00');
  const [serviceFee, setServiceFee] = useState(affidavitData?.service_fee || '0.00');

  // Additional info
  const [additionalInfo, setAdditionalInfo] = useState(affidavitData?.additional_info || '');

  // Validation errors
  const [errors, setErrors] = useState({});

  // Update parent component when fields change
  useEffect(() => {
    if (!onDataChange) return;

    const totalFee = (parseFloat(travelFee) || 0) + (parseFloat(serviceFee) || 0);

    const updatedData = {
      service_method: serviceMethod,
      case_number: caseNumber,
      recipient_name: recipientName,
      date_received: dateReceived,
      service_place: servicePlace,
      residence_recipient: residenceRecipient,
      residence_person_name: residencePersonName,
      residence_date: residenceDate,
      residence_address: residenceAddress,
      residence_relationship: residenceRelationship,
      residence_age: residenceAge,
      organization_agent: organizationAgent,
      organization_name: organizationName,
      organization_date: organizationDate,
      unexecuted_recipient: unexecutedRecipient,
      unexecuted_reason: unexecutedReason,
      other_recipient: otherRecipient,
      other_description: otherDescription,
      server_name: serverName,
      server_address: serverAddress,
      travel_fee: travelFee,
      service_fee: serviceFee,
      total_fee: totalFee.toFixed(2),
      additional_info: additionalInfo,
    };

    onDataChange('ao440_fields', updatedData);
  }, [
    serviceMethod, caseNumber, recipientName, dateReceived, servicePlace,
    residenceRecipient, residencePersonName, residenceDate, residenceAddress,
    residenceRelationship, residenceAge, organizationAgent, organizationName,
    organizationDate, unexecutedRecipient, unexecutedReason, otherRecipient,
    otherDescription, serverName, serverAddress, travelFee, serviceFee,
    additionalInfo, onDataChange
  ]);

  // Validate fields based on selected service method
  const validate = () => {
    const newErrors = {};

    if (!caseNumber.trim()) {
      newErrors.caseNumber = 'Case number is required';
    }

    if (!serverName.trim()) {
      newErrors.serverName = 'Server name is required';
    }

    switch (serviceMethod) {
      case 'personal':
        if (!recipientName.trim()) newErrors.recipientName = 'Recipient name is required';
        if (!dateReceived.trim()) newErrors.dateReceived = 'Date is required';
        if (!servicePlace.trim()) newErrors.servicePlace = 'Place of service is required';
        break;

      case 'residence':
        if (!residenceRecipient.trim()) newErrors.residenceRecipient = 'Recipient name is required';
        if (!residencePersonName.trim()) newErrors.residencePersonName = 'Person served name is required';
        if (!residenceDate.trim()) newErrors.residenceDate = 'Date is required';
        if (!residenceAddress.trim()) newErrors.residenceAddress = 'Address is required';
        if (!residenceRelationship.trim()) newErrors.residenceRelationship = 'Relationship is required';
        break;

      case 'organization':
        if (!organizationAgent.trim()) newErrors.organizationAgent = 'Agent name is required';
        if (!organizationName.trim()) newErrors.organizationName = 'Organization name is required';
        if (!organizationDate.trim()) newErrors.organizationDate = 'Date is required';
        break;

      case 'unexecuted':
        if (!unexecutedRecipient.trim()) newErrors.unexecutedRecipient = 'Recipient name is required';
        if (!unexecutedReason.trim()) newErrors.unexecutedReason = 'Reason is required';
        break;

      case 'other':
        if (!otherRecipient.trim()) newErrors.otherRecipient = 'Recipient name is required';
        if (!otherDescription.trim()) newErrors.otherDescription = 'Description is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calculate total fee
  const totalFee = ((parseFloat(travelFee) || 0) + (parseFloat(serviceFee) || 0)).toFixed(2);

  if (!isEditing) {
    return null; // Don't render in view mode
  }

  return (
    <div className="p-6 space-y-6 bg-blue-50 border-2 border-blue-300 rounded-lg">
      <div className="bg-blue-100 p-3 rounded">
        <p className="text-sm font-medium text-blue-900">
          ✏️ Edit Mode: Complete all required fields below. The form will update automatically.
        </p>
      </div>

      {/* Case Number */}
      <div>
        <Label htmlFor="case-number" className="text-sm font-semibold">
          Civil Action No. <span className="text-red-600">*</span>
        </Label>
        <Input
          id="case-number"
          value={caseNumber}
          onChange={(e) => setCaseNumber(e.target.value)}
          placeholder="Enter case number"
          className={`mt-1 ${errors.caseNumber ? 'border-red-500' : ''}`}
        />
        {errors.caseNumber && (
          <p className="text-xs text-red-600 mt-1">{errors.caseNumber}</p>
        )}
      </div>

      {/* Service Method Selection */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">
          Service Method <span className="text-red-600">*</span>
        </Label>
        <RadioGroup value={serviceMethod} onValueChange={setServiceMethod} className="space-y-3">
          <div className="flex items-start space-x-3 p-3 border rounded hover:bg-blue-100 transition-colors">
            <RadioGroupItem value="personal" id="personal" className="mt-1" />
            <Label htmlFor="personal" className="flex-1 cursor-pointer text-sm">
              Personal Service - I served the summons and complaint by delivering copies to the individual named above
            </Label>
          </div>

          <div className="flex items-start space-x-3 p-3 border rounded hover:bg-blue-100 transition-colors">
            <RadioGroupItem value="residence" id="residence" className="mt-1" />
            <Label htmlFor="residence" className="flex-1 cursor-pointer text-sm">
              Substitute Service - Residence/Dwelling House/Usual Place of Abode
            </Label>
          </div>

          <div className="flex items-start space-x-3 p-3 border rounded hover:bg-blue-100 transition-colors">
            <RadioGroupItem value="organization" id="organization" className="mt-1" />
            <Label htmlFor="organization" className="flex-1 cursor-pointer text-sm">
              Service on Organization - Authorized agent designated by law
            </Label>
          </div>

          <div className="flex items-start space-x-3 p-3 border rounded hover:bg-blue-100 transition-colors">
            <RadioGroupItem value="unexecuted" id="unexecuted" className="mt-1" />
            <Label htmlFor="unexecuted" className="flex-1 cursor-pointer text-sm">
              Unexecuted Service - I was unable to serve the individual named above
            </Label>
          </div>

          <div className="flex items-start space-x-3 p-3 border rounded hover:bg-blue-100 transition-colors">
            <RadioGroupItem value="other" id="other" className="mt-1" />
            <Label htmlFor="other" className="flex-1 cursor-pointer text-sm">
              Other Method
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Personal Service Fields */}
      {serviceMethod === 'personal' && (
        <div className="space-y-4 p-4 bg-white border-2 border-green-300 rounded">
          <h3 className="font-semibold text-green-900">Personal Service Details</h3>

          <div>
            <Label htmlFor="recipient-name">
              Name of individual served <span className="text-red-600">*</span>
            </Label>
            <Input
              id="recipient-name"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Full name of person served"
              className={errors.recipientName ? 'border-red-500' : ''}
            />
            {errors.recipientName && (
              <p className="text-xs text-red-600 mt-1">{errors.recipientName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="date-received">
              Date received by me <span className="text-red-600">*</span>
            </Label>
            <Input
              id="date-received"
              type="date"
              value={dateReceived}
              onChange={(e) => setDateReceived(e.target.value)}
              className={errors.dateReceived ? 'border-red-500' : ''}
            />
            {errors.dateReceived && (
              <p className="text-xs text-red-600 mt-1">{errors.dateReceived}</p>
            )}
          </div>

          <div>
            <Label htmlFor="service-place">
              Place where served <span className="text-red-600">*</span>
            </Label>
            <Input
              id="service-place"
              value={servicePlace}
              onChange={(e) => setServicePlace(e.target.value)}
              placeholder="Address or location where service occurred"
              className={errors.servicePlace ? 'border-red-500' : ''}
            />
            {errors.servicePlace && (
              <p className="text-xs text-red-600 mt-1">{errors.servicePlace}</p>
            )}
          </div>
        </div>
      )}

      {/* Residence Service Fields */}
      {serviceMethod === 'residence' && (
        <div className="space-y-4 p-4 bg-white border-2 border-blue-300 rounded">
          <h3 className="font-semibold text-blue-900">Substitute Service - Residence Details</h3>

          <div>
            <Label htmlFor="residence-recipient">
              Name of individual for whom service was intended <span className="text-red-600">*</span>
            </Label>
            <Input
              id="residence-recipient"
              value={residenceRecipient}
              onChange={(e) => setResidenceRecipient(e.target.value)}
              placeholder="Intended recipient name"
              className={errors.residenceRecipient ? 'border-red-500' : ''}
            />
            {errors.residenceRecipient && (
              <p className="text-xs text-red-600 mt-1">{errors.residenceRecipient}</p>
            )}
          </div>

          <div>
            <Label htmlFor="residence-person-name">
              Name of person with whom copies were left <span className="text-red-600">*</span>
            </Label>
            <Input
              id="residence-person-name"
              value={residencePersonName}
              onChange={(e) => setResidencePersonName(e.target.value)}
              placeholder="Person who received the documents"
              className={errors.residencePersonName ? 'border-red-500' : ''}
            />
            {errors.residencePersonName && (
              <p className="text-xs text-red-600 mt-1">{errors.residencePersonName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="residence-relationship">
              Relationship to recipient <span className="text-red-600">*</span>
            </Label>
            <Input
              id="residence-relationship"
              value={residenceRelationship}
              onChange={(e) => setResidenceRelationship(e.target.value)}
              placeholder="e.g., Spouse, Adult Resident, Family Member"
              className={errors.residenceRelationship ? 'border-red-500' : ''}
            />
            {errors.residenceRelationship && (
              <p className="text-xs text-red-600 mt-1">{errors.residenceRelationship}</p>
            )}
          </div>

          <div>
            <Label htmlFor="residence-age">
              Approximate age (must be 18 or older)
            </Label>
            <Input
              id="residence-age"
              value={residenceAge}
              onChange={(e) => setResidenceAge(e.target.value)}
              placeholder="e.g., 25, 30-35"
            />
          </div>

          <div>
            <Label htmlFor="residence-date">
              Date served <span className="text-red-600">*</span>
            </Label>
            <Input
              id="residence-date"
              type="date"
              value={residenceDate}
              onChange={(e) => setResidenceDate(e.target.value)}
              className={errors.residenceDate ? 'border-red-500' : ''}
            />
            {errors.residenceDate && (
              <p className="text-xs text-red-600 mt-1">{errors.residenceDate}</p>
            )}
          </div>

          <div>
            <Label htmlFor="residence-address">
              Address where served <span className="text-red-600">*</span>
            </Label>
            <Input
              id="residence-address"
              value={residenceAddress}
              onChange={(e) => setResidenceAddress(e.target.value)}
              placeholder="Full address of residence"
              className={errors.residenceAddress ? 'border-red-500' : ''}
            />
            {errors.residenceAddress && (
              <p className="text-xs text-red-600 mt-1">{errors.residenceAddress}</p>
            )}
          </div>
        </div>
      )}

      {/* Organization Service Fields */}
      {serviceMethod === 'organization' && (
        <div className="space-y-4 p-4 bg-white border-2 border-purple-300 rounded">
          <h3 className="font-semibold text-purple-900">Service on Organization Details</h3>

          <div>
            <Label htmlFor="organization-agent">
              Name of individual served (authorized agent) <span className="text-red-600">*</span>
            </Label>
            <Input
              id="organization-agent"
              value={organizationAgent}
              onChange={(e) => setOrganizationAgent(e.target.value)}
              placeholder="Name of authorized agent/representative"
              className={errors.organizationAgent ? 'border-red-500' : ''}
            />
            {errors.organizationAgent && (
              <p className="text-xs text-red-600 mt-1">{errors.organizationAgent}</p>
            )}
          </div>

          <div>
            <Label htmlFor="organization-name">
              Name of organization <span className="text-red-600">*</span>
            </Label>
            <Input
              id="organization-name"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Full legal name of organization"
              className={errors.organizationName ? 'border-red-500' : ''}
            />
            {errors.organizationName && (
              <p className="text-xs text-red-600 mt-1">{errors.organizationName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="organization-date">
              Date served <span className="text-red-600">*</span>
            </Label>
            <Input
              id="organization-date"
              type="date"
              value={organizationDate}
              onChange={(e) => setOrganizationDate(e.target.value)}
              className={errors.organizationDate ? 'border-red-500' : ''}
            />
            {errors.organizationDate && (
              <p className="text-xs text-red-600 mt-1">{errors.organizationDate}</p>
            )}
          </div>
        </div>
      )}

      {/* Unexecuted Service Fields */}
      {serviceMethod === 'unexecuted' && (
        <div className="space-y-4 p-4 bg-white border-2 border-red-300 rounded">
          <h3 className="font-semibold text-red-900">Unexecuted Service Details</h3>

          <div>
            <Label htmlFor="unexecuted-recipient">
              Name of individual I was unable to serve <span className="text-red-600">*</span>
            </Label>
            <Input
              id="unexecuted-recipient"
              value={unexecutedRecipient}
              onChange={(e) => setUnexecutedRecipient(e.target.value)}
              placeholder="Name of intended recipient"
              className={errors.unexecutedRecipient ? 'border-red-500' : ''}
            />
            {errors.unexecutedRecipient && (
              <p className="text-xs text-red-600 mt-1">{errors.unexecutedRecipient}</p>
            )}
          </div>

          <div>
            <Label htmlFor="unexecuted-reason">
              Reason for non-service <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="unexecuted-reason"
              value={unexecutedReason}
              onChange={(e) => setUnexecutedReason(e.target.value)}
              placeholder="Explain why service could not be completed (e.g., person not found, refused service, address incorrect)"
              rows={4}
              className={errors.unexecutedReason ? 'border-red-500' : ''}
            />
            {errors.unexecutedReason && (
              <p className="text-xs text-red-600 mt-1">{errors.unexecutedReason}</p>
            )}
          </div>
        </div>
      )}

      {/* Other Method Fields */}
      {serviceMethod === 'other' && (
        <div className="space-y-4 p-4 bg-white border-2 border-orange-300 rounded">
          <h3 className="font-semibold text-orange-900">Other Service Method Details</h3>

          <div>
            <Label htmlFor="other-recipient">
              Name of individual <span className="text-red-600">*</span>
            </Label>
            <Input
              id="other-recipient"
              value={otherRecipient}
              onChange={(e) => setOtherRecipient(e.target.value)}
              placeholder="Name of person served or intended recipient"
              className={errors.otherRecipient ? 'border-red-500' : ''}
            />
            {errors.otherRecipient && (
              <p className="text-xs text-red-600 mt-1">{errors.otherRecipient}</p>
            )}
          </div>

          <div>
            <Label htmlFor="other-description">
              Description of service method <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="other-description"
              value={otherDescription}
              onChange={(e) => setOtherDescription(e.target.value)}
              placeholder="Describe the method of service used, including date, location, and circumstances"
              rows={4}
              className={errors.otherDescription ? 'border-red-500' : ''}
            />
            {errors.otherDescription && (
              <p className="text-xs text-red-600 mt-1">{errors.otherDescription}</p>
            )}
          </div>
        </div>
      )}

      {/* Server Information */}
      <div className="space-y-4 p-4 bg-white border-2 border-slate-300 rounded">
        <h3 className="font-semibold text-slate-900">Server Information</h3>

        <div>
          <Label htmlFor="server-name">
            Server's name (printed) <span className="text-red-600">*</span>
          </Label>
          <Input
            id="server-name"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            placeholder="Your full name"
            className={errors.serverName ? 'border-red-500' : ''}
          />
          {errors.serverName && (
            <p className="text-xs text-red-600 mt-1">{errors.serverName}</p>
          )}
        </div>

        <div>
          <Label htmlFor="server-address">
            Server's address
          </Label>
          <Textarea
            id="server-address"
            value={serverAddress}
            onChange={(e) => setServerAddress(e.target.value)}
            placeholder="Your full address (street, city, state, zip)"
            rows={3}
          />
        </div>
      </div>

      {/* Fee Information */}
      <div className="space-y-4 p-4 bg-white border-2 border-green-300 rounded">
        <h3 className="font-semibold text-green-900">Fee Information</h3>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="travel-fee">Travel Fee ($)</Label>
            <Input
              id="travel-fee"
              type="number"
              step="0.01"
              min="0"
              value={travelFee}
              onChange={(e) => setTravelFee(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="service-fee">Service Fee ($)</Label>
            <Input
              id="service-fee"
              type="number"
              step="0.01"
              min="0"
              value={serviceFee}
              onChange={(e) => setServiceFee(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Total Fee ($)</Label>
            <div className="h-10 px-3 py-2 border rounded bg-slate-100 flex items-center font-semibold">
              {totalFee}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div>
        <Label htmlFor="additional-info">
          Additional information regarding attempted service
        </Label>
        <Textarea
          id="additional-info"
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          placeholder="Any additional details about the service attempt"
          rows={4}
        />
      </div>

      {/* Validation Button */}
      <div className="pt-4">
        <button
          type="button"
          onClick={validate}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition-colors"
        >
          Validate Form
        </button>
        {Object.keys(errors).length > 0 && (
          <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded">
            <p className="text-sm font-semibold text-red-900">
              ⚠️ Please fix the following errors:
            </p>
            <ul className="mt-2 text-xs text-red-800 list-disc list-inside">
              {Object.values(errors).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
