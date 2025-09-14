
import React, { useState, useEffect } from "react";
import { Client, User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, X, Plus } from "lucide-react";

export default function NewClientQuickForm({ onClientCreated, onCancel }) {
  const [formData, setFormData] = useState({
    company_name: "",
    company_type: "law_firm",
    status: "active",
    contacts: [{
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      title: "",
      primary: true
    }],
    addresses: [{
      label: "Main Office",
      address1: "",
      city: "",
      state: "",
      postal_code: "",
      primary: true
    }]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await User.me();
        if (user && user.email) {
          setCurrentUserEmail(user.email);
        }
      } catch (error) {
        console.error("Failed to fetch current user", error);
      }
    };
    fetchUser();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleContactChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      contacts: [{
        ...prev.contacts[0],
        [field]: value
      }]
    }));
  };

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      addresses: [{
        ...prev.addresses[0],
        [field]: value
      }]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dataToSubmit = {
        ...formData,
        job_sharing_email: currentUserEmail,
      };
      const newClient = await Client.create(dataToSubmit);
      onClientCreated(newClient);
    } catch (error) {
      console.error("Error creating client:", error);
    }
    
    setIsSubmitting(false);
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Add New Client</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new_company_name">Company Name</Label>
              <Input 
                id="new_company_name"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                required
                placeholder="Enter company name"
              />
            </div>
            <div>
              <Label htmlFor="new_company_type">Company Type</Label>
              <Select value={formData.company_type} onValueChange={(value) => handleInputChange('company_type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
          </div>

          {/* Primary Contact */}
          <div className="space-y-3">
            <h4 className="font-medium text-slate-700">Primary Contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input 
                  value={formData.contacts[0].first_name}
                  onChange={(e) => handleContactChange('first_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input 
                  value={formData.contacts[0].last_name}
                  onChange={(e) => handleContactChange('last_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={formData.contacts[0].email}
                  onChange={(e) => handleContactChange('email', e.target.value)}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input 
                  value={formData.contacts[0].phone}
                  onChange={(e) => handleContactChange('phone', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Primary Address */}
          <div className="space-y-3">
            <h4 className="font-medium text-slate-700">Address</h4>
            <div>
              <Label>Street Address</Label>
              <Input 
                value={formData.addresses[0].address1}
                onChange={(e) => handleAddressChange('address1', e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>City</Label>
                <Input 
                  value={formData.addresses[0].city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                />
              </div>
              <div>
                <Label>State</Label>
                <Input 
                  value={formData.addresses[0].state}
                  onChange={(e) => handleAddressChange('state', e.target.value)}
                />
              </div>
              <div>
                <Label>ZIP Code</Label>
                <Input 
                  value={formData.addresses[0].postal_code}
                  onChange={(e) => handleAddressChange('postal_code', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Client
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
