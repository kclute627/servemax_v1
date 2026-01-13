import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
// FIREBASE TRANSITION: Replace these with your Firebase service imports
import { Client } from "@/api/entities";
import { Plus, Loader2, Trash2, Star } from "lucide-react";
import AddressAutocomplete from "@/components/jobs/AddressAutocomplete";

const getInitialState = () => ({
  company_name: "",
  company_type: "law_firm",
  website: "",
  status: "active",
  private_note: "",
  contacts: [{ first_name: "", last_name: "", email: "", phone: "", title: "", primary: true }],
  addresses: [{ label: "Main Office", address1: "", city: "", state: "", postal_code: "", county: "", latitude: null, longitude: null, primary: true }],
  phone_numbers: [],
  email_addresses: [],
  // Independent Contractor fields
  date_of_birth: "",
  license_number: "",
  license_expires: "",
  server_pay_enabled: false
});

export default function NewClientDialog({ open, onOpenChange, onClientCreated }) {
  const [formData, setFormData] = useState(getInitialState());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset form when dialog is closed
      setFormData(getInitialState());
    }
  }, [open]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleContactChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const handleAddressChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.map((address, i) => 
        i === index ? { ...address, [field]: value } : address
      )
    }));
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { first_name: "", last_name: "", email: "", phone: "", title: "", primary: false }]
    }));
  };

  const removeContact = (index) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  const setPrimaryContact = (index) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => ({
        ...contact,
        primary: i === index
      }))
    }));
  };

  const addAddress = () => {
    setFormData(prev => ({
      ...prev,
      addresses: [...prev.addresses, { label: "", address1: "", city: "", state: "", postal_code: "", county: "", latitude: null, longitude: null, primary: false }]
    }));
  };

  const handleAddressAutocompleteSelect = (index, addressDetails) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.map((address, i) =>
        i === index ? {
          ...address,
          address1: addressDetails.address1 || '',
          city: addressDetails.city || '',
          state: addressDetails.state || '',
          postal_code: addressDetails.postal_code || '',
          county: addressDetails.county || '',
          latitude: addressDetails.latitude || null,
          longitude: addressDetails.longitude || null
        } : address
      )
    }));
  };

  const removeAddress = (index) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index)
    }));
  };

  const setPrimaryAddress = (index) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.map((address, i) => ({
        ...address,
        primary: i === index
      }))
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // FIREBASE TRANSITION: Replace with addDoc(collection(db, "clients"), formData)
      await Client.create(formData);

      // Reset form
      setFormData(getInitialState());

      onClientCreated();
    } catch (error) {
      console.error("Error creating client:", error);
    }
    
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Client
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 p-1">
          {/* Company Information */}
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-semibold text-slate-900">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_name">Company Name</Label>
                <Input id="company_name" value={formData.company_name} onChange={(e) => handleInputChange('company_name', e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={formData.website} onChange={(e) => handleInputChange('website', e.target.value)} placeholder="https://" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_type">Company Type</Label>
                <Select value={formData.company_type} onChange={(e) => handleInputChange('company_type', e.target.value)}>
                  <SelectItem value="law_firm">Law Firm</SelectItem>
                  <SelectItem value="process_serving">Process Serving Company</SelectItem>
                  <SelectItem value="independent_contractor">Independent Contractor</SelectItem>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onChange={(e) => handleInputChange('status', e.target.value)}>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </Select>
              </div>
            </div>
          </div>

          {/* Independent Contractor Fields */}
          {formData.company_type === 'independent_contractor' && (
            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-semibold text-slate-900">Contractor Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="license_number">License Number</Label>
                  <Input
                    id="license_number"
                    value={formData.license_number}
                    onChange={(e) => handleInputChange('license_number', e.target.value)}
                    placeholder="Enter license number"
                  />
                </div>
                <div>
                  <Label htmlFor="license_expires">License Expires</Label>
                  <Input
                    id="license_expires"
                    type="date"
                    value={formData.license_expires}
                    onChange={(e) => handleInputChange('license_expires', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label htmlFor="server_pay_enabled" className="text-base font-medium">Enable Server Pay</Label>
                  <p className="text-sm text-slate-500 mt-1">Track commissions and pay for this contractor</p>
                </div>
                <Switch
                  id="server_pay_enabled"
                  checked={formData.server_pay_enabled}
                  onCheckedChange={(checked) => handleInputChange('server_pay_enabled', checked)}
                />
              </div>
            </div>
          )}

          {/* Contacts */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Contacts</h3>
              {formData.contacts.length > 0 &&
               formData.contacts[formData.contacts.length - 1].first_name &&
               formData.contacts[formData.contacts.length - 1].last_name && (
                <Button type="button" variant="outline" size="sm" onClick={addContact}><Plus className="w-4 h-4 mr-2" />Add Contact</Button>
              )}
            </div>
            {formData.contacts.map((contact, index) => (
              <div key={index} className={`p-4 rounded-lg space-y-4 ${contact.primary ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-700 flex items-center gap-2">
                    Contact {index + 1}
                    {contact.primary && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Primary</span>}
                  </h4>
                  <div className="flex items-center gap-1">
                    {formData.contacts.length > 1 && !contact.primary && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setPrimaryContact(index)} title="Set as Primary">
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                    {formData.contacts.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeContact(index)}><Trash2 className="w-4 h-4" /></Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input value={contact.first_name} onChange={(e) => handleContactChange(index, 'first_name', e.target.value)} required />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input value={contact.last_name} onChange={(e) => handleContactChange(index, 'last_name', e.target.value)} required />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={contact.email} onChange={(e) => handleContactChange(index, 'email', e.target.value)} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input type="tel" value={contact.phone} onChange={(e) => handleContactChange(index, 'phone', e.target.value)} />
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input value={contact.title} onChange={(e) => handleContactChange(index, 'title', e.target.value)} placeholder="e.g., Attorney, Manager" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Addresses */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Addresses</h3>
              {formData.addresses.length > 0 &&
               formData.addresses[formData.addresses.length - 1].address1 && (
                <Button type="button" variant="outline" size="sm" onClick={addAddress}><Plus className="w-4 h-4 mr-2" />Add Address</Button>
              )}
            </div>
            {formData.addresses.map((address, index) => (
              <div key={index} className={`p-4 rounded-lg space-y-4 ${address.primary ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-700 flex items-center gap-2">
                    Address {index + 1}
                    {address.primary && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Primary</span>}
                  </h4>
                  <div className="flex items-center gap-1">
                    {formData.addresses.length > 1 && !address.primary && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setPrimaryAddress(index)} title="Set as Primary">
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                    {formData.addresses.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeAddress(index)}><Trash2 className="w-4 h-4" /></Button>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Label</Label>
                    <Input value={address.label} onChange={(e) => handleAddressChange(index, 'label', e.target.value)} placeholder="e.g., Main Office, Billing" />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <AddressAutocomplete
                      value={address.address1}
                      onChange={(value) => handleAddressChange(index, 'address1', value)}
                      onAddressSelect={(addressDetails) => handleAddressAutocompleteSelect(index, addressDetails)}
                      onLoadingChange={setIsAddressLoading}
                      placeholder="Start typing address..."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>City</Label>
                      <Input value={address.city} onChange={(e) => handleAddressChange(index, 'city', e.target.value)} disabled={isAddressLoading} />
                    </div>
                    <div>
                      <Label>State</Label>
                      <Input value={address.state} onChange={(e) => handleAddressChange(index, 'state', e.target.value)} disabled={isAddressLoading} />
                    </div>
                    <div>
                      <Label>Postal Code</Label>
                      <Input value={address.postal_code} onChange={(e) => handleAddressChange(index, 'postal_code', e.target.value)} disabled={isAddressLoading} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="private_note">Private Notes</Label>
            <Textarea id="private_note" value={formData.private_note} onChange={(e) => handleInputChange('private_note', e.target.value)} rows={3} placeholder="Internal notes about this client..." className="resize-none" />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800">
              {isSubmitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>) : ('Create Client')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}