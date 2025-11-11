import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { DirectoryManager, COMPANY_TYPES, USER_TYPES } from "@/firebase/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, BookUser, DollarSign, MapPin, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AddressAutocomplete from "../jobs/AddressAutocomplete";

export default function DirectoryProfilePanel() {
  const { user } = useAuth();
  const [directoryListing, setDirectoryListing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    blurb: '',
    services_offered: ['standard_service'],
    coverage_areas: [],
    service_radius_miles: 25,
    rates: {
      standard_service: 75.00,
      rush_service: 125.00,
      weekend_service: 150.00
    },
    availability: {
      accepts_rush_jobs: true,
      accepts_weekend_jobs: false,
      average_turnaround_days: 3
    },
    contact_preferences: {
      email: true,
      phone: true,
      secure_messaging: true
    },
    is_active: true
  });

  const [newCoverageArea, setNewCoverageArea] = useState('');

  const serviceOptions = [
    { value: 'standard_service', label: 'Standard Service' },
    { value: 'rush_service', label: 'Rush Service' },
    { value: 'weekend_service', label: 'Weekend Service' },
    { value: 'court_filing', label: 'Court Filing' },
    { value: 'document_retrieval', label: 'Document Retrieval' },
    { value: 'witness_service', label: 'Witness Service' }
  ];

  useEffect(() => {
    if (user) {
      loadDirectoryProfile();
    }
  }, [user]);

  const loadDirectoryProfile = async () => {
    if (!user?.company_id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Check if user type is independent contractor or if company type allows directory listing
      const canHaveDirectoryProfile =
        user.user_type === USER_TYPES.INDEPENDENT_CONTRACTOR ||
        user.company?.company_type === COMPANY_TYPES.PROCESS_SERVING;

      if (!canHaveDirectoryProfile) {
        setIsLoading(false);
        return;
      }

      const listing = await DirectoryManager.getDirectoryListing(user.company_id);
      setDirectoryListing(listing);

      if (listing) {
        setProfileData({
          name: listing.name || '',
          email: listing.email || '',
          phone: listing.phone || '',
          address: listing.address || '',
          city: listing.city || '',
          state: listing.state || '',
          zip: listing.zip || '',
          blurb: listing.blurb || '',
          services_offered: listing.services_offered || ['standard_service'],
          coverage_areas: listing.coverage_areas || [],
          service_radius_miles: listing.service_radius_miles || 25,
          rates: listing.rates || {
            standard_service: 75.00,
            rush_service: 125.00,
            weekend_service: 150.00
          },
          availability: listing.availability || {
            accepts_rush_jobs: true,
            accepts_weekend_jobs: false,
            average_turnaround_days: 3
          },
          contact_preferences: listing.contact_preferences || {
            email: true,
            phone: true,
            secure_messaging: true
          },
          is_active: listing.is_active !== undefined ? listing.is_active : true
        });
      } else {
        // Initialize with company/user data if no directory listing exists
        if (user.company) {
          setProfileData(prev => ({
            ...prev,
            name: user.company.name || '',
            email: user.company.email || '',
            phone: user.company.phone || '',
            address: user.company.address || '',
            city: user.company.city || '',
            state: user.company.state || '',
            zip: user.company.zip || ''
          }));
        }
      }
    } catch (error) {
      console.error("Error loading directory profile:", error);
    }
    setIsLoading(false);
  };

  const saveDirectoryProfile = async () => {
    if (!user?.company_id) {
      alert("No company associated with user");
      return;
    }

    setIsSaving(true);
    try {
      const companyType = user.user_type === USER_TYPES.INDEPENDENT_CONTRACTOR
        ? COMPANY_TYPES.INDEPENDENT_CONTRACTOR
        : user.company?.company_type;

      if (directoryListing) {
        // Update existing listing
        await DirectoryManager.updateDirectoryListing(user.company_id, profileData);
      } else {
        // Create new listing
        await DirectoryManager.addToDirectory(user.company_id, {
          ...profileData,
          company_type: companyType
        });
      }

      // Reload to get updated data
      await loadDirectoryProfile();
      alert("Directory profile saved successfully!");
    } catch (error) {
      console.error("Error saving directory profile:", error);
      alert("Failed to save directory profile");
    }
    setIsSaving(false);
  };

  const updateProfileData = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (parent, field, value) => {
    setProfileData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const toggleService = (service) => {
    setProfileData(prev => ({
      ...prev,
      services_offered: prev.services_offered.includes(service)
        ? prev.services_offered.filter(s => s !== service)
        : [...prev.services_offered, service]
    }));
  };

  const addCoverageArea = () => {
    if (newCoverageArea.trim() && !profileData.coverage_areas.includes(newCoverageArea.trim())) {
      setProfileData(prev => ({
        ...prev,
        coverage_areas: [...prev.coverage_areas, newCoverageArea.trim()]
      }));
      setNewCoverageArea('');
    }
  };

  const removeCoverageArea = (area) => {
    setProfileData(prev => ({
      ...prev,
      coverage_areas: prev.coverage_areas.filter(a => a !== area)
    }));
  };

  const handleAddressSelect = (addressDetails) => {
    setProfileData(prev => ({
      ...prev,
      address: addressDetails.address1 || '',
      city: addressDetails.city || '',
      state: addressDetails.state || '',
      zip: addressDetails.postal_code || '',
      county: addressDetails.county || ''
    }));
  };

  // Check if user can access directory features
  const canAccessDirectory =
    user?.user_type === USER_TYPES.INDEPENDENT_CONTRACTOR ||
    user?.company?.company_type === COMPANY_TYPES.PROCESS_SERVING;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!canAccessDirectory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookUser className="w-5 h-5" />
            Directory Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">
            Directory profiles are only available for independent contractors and process serving companies.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookUser className="w-5 h-5" />
            Directory Profile
            {directoryListing && (
              <Badge variant={profileData.is_active ? "default" : "secondary"}>
                {profileData.is_active ? "Active" : "Inactive"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-medium">
                {directoryListing ? "Update your directory listing" : "Create your directory profile"}
              </div>
              <p className="text-sm text-slate-500">
                Make your services discoverable to other ServeMax users.
              </p>
            </div>
            <Switch
              checked={profileData.is_active}
              onCheckedChange={(checked) => updateProfileData('is_active', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {profileData.is_active && (
        <>
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Business/Company Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => updateProfileData('name', e.target.value)}
                    placeholder="Your business name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => updateProfileData('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => updateProfileData('email', e.target.value)}
                  placeholder="contact@business.com"
                />
              </div>

              <div>
                <Label htmlFor="blurb">Business Description</Label>
                <Textarea
                  id="blurb"
                  value={profileData.blurb}
                  onChange={(e) => updateProfileData('blurb', e.target.value)}
                  placeholder="Describe your services, experience, and what makes you unique..."
                  maxLength={250}
                />
                <p className="text-xs text-slate-500 mt-1 text-right">
                  {250 - (profileData.blurb?.length || 0)} characters remaining
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">Street Address</Label>
                <AddressAutocomplete
                  id="address"
                  value={profileData.address}
                  onChange={(value) => updateProfileData('address', value)}
                  onAddressSelect={handleAddressSelect}
                  onLoadingChange={setIsAddressLoading}
                  placeholder="Start typing your address..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={profileData.city}
                    onChange={(e) => updateProfileData('city', e.target.value)}
                    placeholder="City"
                    disabled={isAddressLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={profileData.state}
                    onChange={(e) => updateProfileData('state', e.target.value)}
                    placeholder="CA"
                    disabled={isAddressLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={profileData.zip}
                    onChange={(e) => updateProfileData('zip', e.target.value)}
                    placeholder="12345"
                    disabled={isAddressLoading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services Offered */}
          <Card>
            <CardHeader>
              <CardTitle>Services Offered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {serviceOptions.map(service => (
                  <div key={service.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={service.value}
                      checked={profileData.services_offered.includes(service.value)}
                      onChange={() => toggleService(service.value)}
                      className="rounded border-slate-300"
                    />
                    <Label htmlFor={service.value} className="text-sm">
                      {service.label}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Service Rates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="standard-rate">Standard Service ($)</Label>
                  <Input
                    id="standard-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={profileData.rates.standard_service}
                    onChange={(e) => updateNestedField('rates', 'standard_service', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="rush-rate">Rush Service ($)</Label>
                  <Input
                    id="rush-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={profileData.rates.rush_service}
                    onChange={(e) => updateNestedField('rates', 'rush_service', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="weekend-rate">Weekend Service ($)</Label>
                  <Input
                    id="weekend-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={profileData.rates.weekend_service}
                    onChange={(e) => updateNestedField('rates', 'weekend_service', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coverage Areas */}
          <Card>
            <CardHeader>
              <CardTitle>Coverage Areas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newCoverageArea}
                  onChange={(e) => setNewCoverageArea(e.target.value)}
                  placeholder="Enter ZIP code"
                  onKeyPress={(e) => e.key === 'Enter' && addCoverageArea()}
                />
                <Button type="button" onClick={addCoverageArea} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {profileData.coverage_areas.map((area, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {area}
                    <button onClick={() => removeCoverageArea(area)} className="text-slate-500 hover:text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div>
                <Label htmlFor="radius">Service Radius (miles)</Label>
                <Input
                  id="radius"
                  type="number"
                  min="1"
                  max="200"
                  value={profileData.service_radius_miles}
                  onChange={(e) => updateProfileData('service_radius_miles', parseInt(e.target.value) || 25)}
                  className="w-32"
                />
              </div>
            </CardContent>
          </Card>

          {/* Availability Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Accept rush jobs</Label>
                  <Switch
                    checked={profileData.availability.accepts_rush_jobs}
                    onCheckedChange={(checked) => updateNestedField('availability', 'accepts_rush_jobs', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Accept weekend jobs</Label>
                  <Switch
                    checked={profileData.availability.accepts_weekend_jobs}
                    onCheckedChange={(checked) => updateNestedField('availability', 'accepts_weekend_jobs', checked)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="turnaround">Average Turnaround (days)</Label>
                <Input
                  id="turnaround"
                  type="number"
                  min="1"
                  max="30"
                  value={profileData.availability.average_turnaround_days}
                  onChange={(e) => updateNestedField('availability', 'average_turnaround_days', parseInt(e.target.value) || 3)}
                  className="w-32"
                />
              </div>
            </CardContent>
          </Card>

          {/* Directory Stats */}
          {directoryListing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Directory Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-slate-900">
                      {directoryListing.rating_average?.toFixed(1) || '0.0'}
                    </div>
                    <div className="text-sm text-slate-600">Average Rating</div>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-slate-900">
                      {directoryListing.total_jobs_completed || 0}
                    </div>
                    <div className="text-sm text-slate-600">Jobs Completed</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="flex justify-end">
        <Button onClick={saveDirectoryProfile} disabled={isSaving} className="gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Directory Profile'}
        </Button>
      </div>
    </div>
  );
}