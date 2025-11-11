
import React, { useState, useEffect } from "react";
import { Client, User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, X, Plus } from "lucide-react";
import AddressAutocomplete from "./AddressAutocomplete";
import { generateClientSearchTerms } from "@/utils/searchTerms";
import { useToast } from "@/components/ui/use-toast";

export default function NewClientQuickForm({ onClientCreated, onCancel, initialCompanyName = "" }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    company_name: initialCompanyName,
    company_type: "law_firm",
    status: "active",
    contacts: [{
      id: crypto.randomUUID(),
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
  const [isAddressLoading, setIsAddressLoading] = useState(false);

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

  const handleAddressSelect = (addressDetails) => {
    setFormData(prev => ({
      ...prev,
      addresses: [{
        ...prev.addresses[0],
        address1: addressDetails.address1 || '',
        // Preserve address2 (suite/unit) from existing data
        city: addressDetails.city || '',
        state: addressDetails.state || '',
        postal_code: addressDetails.postal_code || '',
        county: addressDetails.county || '',
        latitude: addressDetails.latitude || null,
        longitude: addressDetails.longitude || null
      }]
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const dataToSubmit = {
        ...formData,
        job_sharing_email: currentUserEmail,
      };

      // Generate search terms for efficient searching
      const search_terms = generateClientSearchTerms(dataToSubmit);
      const clientDataWithSearch = {
        ...dataToSubmit,
        search_terms
      };

      console.log('[NewClientQuickForm] Creating client with search_terms:', {
        company_name: clientDataWithSearch.company_name,
        search_terms: clientDataWithSearch.search_terms
      });

      const newClient = await Client.create(clientDataWithSearch);

      console.log('[NewClientQuickForm] Client created:', {
        id: newClient.id,
        company_name: newClient.company_name,
        search_terms: newClient.search_terms
      });

      onClientCreated(newClient);
    } catch (error) {
      console.error("Error creating client:", error);
      // Show error message
      alert("⚠ Failed to create client. Please try again.");
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
        <div className="space-y-4">
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
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="new_company_type">Company Type</Label>
              <Select
                id="new_company_type"
                value={formData.company_type}
                onChange={(e) => handleInputChange('company_type', e.target.value)}
              >
                <SelectItem value="law_firm">Law Firm</SelectItem>
                <SelectItem value="process_serving">Process Serving Company</SelectItem>
                <SelectItem value="independent_process_server">Independent Process Server</SelectItem>
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
                  autoComplete="off"
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={formData.contacts[0].last_name}
                  onChange={(e) => handleContactChange('last_name', e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.contacts[0].email}
                  onChange={(e) => handleContactChange('email', e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.contacts[0].phone}
                  onChange={(e) => handleContactChange('phone', e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {/* Primary Address */}
          <div className="space-y-3">
            <h4 className="font-medium text-slate-700">Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <Label>Street Address</Label>
                <AddressAutocomplete
                  value={formData.addresses[0].address1}
                  onChange={(value) => handleAddressChange('address1', value)}
                  onAddressSelect={handleAddressSelect}
                  onLoadingChange={setIsAddressLoading}
                  placeholder="Start typing an address..."
                />
              </div>
              <div>
                <Label>Suite/Unit</Label>
                <Input
                  value={formData.addresses[0].address2}
                  onChange={(e) => handleAddressChange('address2', e.target.value)}
                  placeholder="Apt, Suite, etc."
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>City</Label>
                <Input
                  value={formData.addresses[0].city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  autoComplete="off"
                  disabled={isAddressLoading}
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={formData.addresses[0].state}
                  onChange={(e) => handleAddressChange('state', e.target.value)}
                  autoComplete="off"
                  disabled={isAddressLoading}
                />
              </div>
              <div>
                <Label>ZIP Code</Label>
                <Input
                  value={formData.addresses[0].postal_code}
                  onChange={(e) => handleAddressChange('postal_code', e.target.value)}
                  autoComplete="off"
                  disabled={isAddressLoading}
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
              type="button"
              onClick={handleSubmit}
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
        </div>
      </CardContent>
    </Card>
  );
}
