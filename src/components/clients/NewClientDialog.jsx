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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Client, User } from "@/api/entities";
import { Plus, Loader2, Trash2 } from "lucide-react";

const getInitialState = (defaultEmail = "") => ({
  company_name: "",
  company_type: "law_firm",
  website: "",
  status: "active",
  private_note: "",
  collaborating: false,
  job_sharing_opt_in: false,
  job_sharing_email: defaultEmail,
  contacts: [{ first_name: "", last_name: "", email: "", phone: "", title: "", primary: true }],
  addresses: [{ label: "Main Office", address1: "", city: "", state: "", postal_code: "", primary: true }],
  phone_numbers: [],
  email_addresses: []
});

export default function NewClientDialog({ open, onOpenChange, onClientCreated }) {
  const [formData, setFormData] = useState(getInitialState());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await User.me();
        if (user && user.email) {
          setCurrentUserEmail(user.email);
          setFormData(getInitialState(user.email));
        }
      } catch (error) {
        console.error("Failed to fetch current user", error);
      }
    };

    if (open) {
      fetchUser();
    } else {
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

  const addAddress = () => {
    setFormData(prev => ({
      ...prev,
      addresses: [...prev.addresses, { label: "", address1: "", city: "", state: "", postal_code: "", primary: false }]
    }));
  };

  const removeAddress = (index) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await Client.create(formData);
      
      // Reset form
      setFormData(getInitialState(currentUserEmail));
      
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
                <Select value={formData.company_type} onValueChange={(value) => handleInputChange('company_type', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="law_firm">Law Firm</SelectItem>
                    <SelectItem value="insurance">Insurance Company</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="process_server">Process Server</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="job_sharing_email">Job Sharing Email</Label>
              <Input 
                id="job_sharing_email"
                type="email"
                value={formData.job_sharing_email}
                onChange={(e) => handleInputChange('job_sharing_email', e.target.value)}
                placeholder="Contact email for outsourced jobs"
              />
              <p className="text-xs text-slate-500 mt-1.5">This email will be used for notifications about jobs shared from other ServeMax users.</p>
            </div>
          </div>

          {/* Contacts */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Contacts</h3>
              <Button type="button" variant="outline" size="sm" onClick={addContact}><Plus className="w-4 h-4 mr-2" />Add Contact</Button>
            </div>
            {formData.contacts.map((contact, index) => (
              <div key={index} className="p-4 bg-slate-50 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-700">Contact {index + 1} {contact.primary && "(Primary)"}</h4>
                  {formData.contacts.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeContact(index)}><Trash2 className="w-4 h-4" /></Button>
                  )}
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
              <Button type="button" variant="outline" size="sm" onClick={addAddress}><Plus className="w-4 h-4 mr-2" />Add Address</Button>
            </div>
            {formData.addresses.map((address, index) => (
              <div key={index} className="p-4 bg-slate-50 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-700">Address {index + 1} {address.primary && "(Primary)"}</h4>
                  {formData.addresses.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeAddress(index)}><Trash2 className="w-4 h-4" /></Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Label</Label>
                    <Input value={address.label} onChange={(e) => handleAddressChange(index, 'label', e.target.value)} placeholder="e.g., Main Office, Billing" />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input value={address.address1} onChange={(e) => handleAddressChange(index, 'address1', e.target.value)} />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input value={address.city} onChange={(e) => handleAddressChange(index, 'city', e.target.value)} />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input value={address.state} onChange={(e) => handleAddressChange(index, 'state', e.target.value)} />
                  </div>
                  <div>
                    <Label>Postal Code</Label>
                    <Input value={address.postal_code} onChange={(e) => handleAddressChange(index, 'postal_code', e.target.value)} />
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