import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, MapPin } from "lucide-react";
import AddressAutocomplete from "./AddressAutocomplete";

export default function AddressListManager({ addresses, onChange, isAddressLoading, setIsAddressLoading }) {
  const handleAddAddress = () => {
    const newAddress = {
      label: `Address ${addresses.length + 1}`,
      address1: "",
      address2: "",
      city: "",
      state: "",
      postal_code: "",
      latitude: null,
      longitude: null,
      primary: false
    };
    onChange([...addresses, newAddress]);
  };

  const handleRemoveAddress = (index) => {
    if (addresses.length === 1) return; // Can't remove last address

    const updatedAddresses = addresses.filter((_, i) => i !== index);

    // If we removed the primary address, make the first one primary
    if (addresses[index].primary && updatedAddresses.length > 0) {
      updatedAddresses[0].primary = true;
    }

    onChange(updatedAddresses);
  };

  const handleAddressChange = (index, field, value) => {
    const updatedAddresses = addresses.map((addr, i) => {
      if (i === index) {
        return { ...addr, [field]: value };
      }
      return addr;
    });
    onChange(updatedAddresses);
  };

  const handleAddressSelect = (index, addressDetails) => {
    console.log('[AddressListManager] Received address details:', addressDetails);

    const updatedAddresses = addresses.map((addr, i) => {
      if (i === index) {
        const updated = {
          ...addr,
          address1: addressDetails.address1 || '',
          address2: addressDetails.address2 || '',
          city: addressDetails.city || '',
          state: addressDetails.state || '',
          postal_code: addressDetails.postal_code || '',
          latitude: addressDetails.latitude || null,
          longitude: addressDetails.longitude || null
        };
        console.log('[AddressListManager] Updated address:', updated);
        return updated;
      }
      return addr;
    });
    onChange(updatedAddresses);
  };

  const handleSetPrimary = (index) => {
    const updatedAddresses = addresses.map((addr, i) => ({
      ...addr,
      primary: i === index
    }));
    onChange(updatedAddresses);
  };

  return (
    <div className="space-y-4">
      {addresses.map((address, index) => (
        <Card key={index} className={`p-4 ${address.primary ? 'border-blue-500 border-2' : 'border-slate-200'}`}>
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input
                  value={address.label}
                  onChange={(e) => handleAddressChange(index, 'label', e.target.value)}
                  className="w-48 font-medium"
                  placeholder="Address label"
                />
                {address.primary && (
                  <Badge className="bg-blue-500">Primary</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!address.primary && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetPrimary(index)}
                  >
                    Set as Primary
                  </Button>
                )}
                {addresses.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAddress(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Address Fields */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <Label>Street Address</Label>
                <AddressAutocomplete
                  value={address.address1}
                  onChange={(value) => {
                    // Only update address1 if user is manually typing (not selecting from dropdown)
                    // The onAddressSelect callback handles updates when selecting from dropdown
                    handleAddressChange(index, 'address1', value);
                  }}
                  onAddressSelect={(details) => handleAddressSelect(index, details)}
                  onLoadingChange={setIsAddressLoading}
                  placeholder="Start typing an address..."
                />
              </div>
              <div>
                <Label>Suite/Unit</Label>
                <Input
                  value={address.address2}
                  onChange={(e) => handleAddressChange(index, 'address2', e.target.value)}
                  placeholder="Apt, Suite, etc."
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>City</Label>
                <Input
                  value={address.city}
                  onChange={(e) => handleAddressChange(index, 'city', e.target.value)}
                  autoComplete="off"
                  disabled={isAddressLoading}
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={address.state}
                  onChange={(e) => handleAddressChange(index, 'state', e.target.value)}
                  autoComplete="off"
                  disabled={isAddressLoading}
                />
              </div>
              <div>
                <Label>ZIP Code</Label>
                <Input
                  value={address.postal_code}
                  onChange={(e) => handleAddressChange(index, 'postal_code', e.target.value)}
                  autoComplete="off"
                  disabled={isAddressLoading}
                />
              </div>
            </div>

            {/* Show lat/lng if available */}
            {address.latitude && address.longitude && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <MapPin className="w-3 h-3" />
                <span>Coordinates: {address.latitude.toFixed(6)}, {address.longitude.toFixed(6)}</span>
              </div>
            )}
          </div>
        </Card>
      ))}

      {/* Add Address Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleAddAddress}
        className="w-full border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Another Address
      </Button>
    </div>
  );
}
