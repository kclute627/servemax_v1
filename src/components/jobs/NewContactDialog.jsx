import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Client } from "@/api/entities";
import { Loader2, UserPlus } from "lucide-react";

export default function NewContactDialog({ open, onOpenChange, client, onContactCreated }) {
  const [contactData, setContactData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field, value) => {
    setContactData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!client) return;

    setIsSubmitting(true);
    try {
      const newContact = { 
        ...contactData,
        primary: client.contacts?.length === 0, // Make primary if it's the first contact
        title: "" // default title
      };
      
      const updatedContacts = [...(client.contacts || []), newContact];
      
      await Client.update(client.id, { contacts: updatedContacts });
      
      onContactCreated(newContact);

      // Reset form and close dialog
      setContactData({ first_name: "", last_name: "", email: "", phone: "" });
      onOpenChange(false);

    } catch (error) {
      console.error("Error creating new contact:", error);
      alert("Failed to add new contact.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add New Contact
          </DialogTitle>
          <DialogDescription>
            Add a new contact for {client?.company_name}. This will update the client's record.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" value={contactData.first_name} onChange={(e) => handleInputChange('first_name', e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" value={contactData.last_name} onChange={(e) => handleInputChange('last_name', e.target.value)} required />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={contactData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" value={contactData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Contact'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}