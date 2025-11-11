import React, { useState, useEffect } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { useToast } from '../ui/use-toast';
import { Loader2, Settings, Users, CheckCircle2, XCircle } from 'lucide-react';

const PartnerManagement = ({ companyId }) => {
  const { toast } = useToast();
  const [partners, setPartners] = useState([]);
  const [editingPartner, setEditingPartner] = useState(null);
  const [zipCodes, setZipCodes] = useState('');
  const [defaultFee, setDefaultFee] = useState('');
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(false);
  const [requiresAcceptance, setRequiresAcceptance] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch partners from Firestore
  useEffect(() => {
    if (!companyId) return;

    const fetchPartners = async () => {
      try {
        const companyDoc = await getDoc(doc(db, 'companies', companyId));
        if (companyDoc.exists()) {
          const companyData = companyDoc.data();
          const partnersList = companyData.job_share_partners || [];
          setPartners(partnersList);
        }
      } catch (error) {
        console.error('Error fetching partners:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPartners();
  }, [companyId]);

  const updatePartnerSettings = async (partnerId) => {
    if (!zipCodes.trim() && autoAssignEnabled) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter at least one ZIP code for auto-assignment",
      });
      return;
    }

    if (!defaultFee && autoAssignEnabled) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a default fee",
      });
      return;
    }

    setSaving(true);
    try {
      const partner = partners.find(p => p.partner_company_id === partnerId);

      if (!partner) {
        throw new Error('Partner not found');
      }

      const updatedPartner = {
        ...partner,
        auto_assignment_enabled: autoAssignEnabled,
        requires_acceptance: requiresAcceptance,
        email_notifications_enabled: emailNotifications,
        auto_assignment_zones: autoAssignEnabled ? [{
          zip_codes: zipCodes.split(',').map(z => z.trim()).filter(z => z),
          auto_assign_priority: 1,
          default_fee: parseFloat(defaultFee),
          enabled: true,
          city: '',
          state: ''
        }] : [],
        updated_at: new Date()
      };

      const companyRef = doc(db, 'companies', companyId);

      // Remove old partner entry
      await updateDoc(companyRef, {
        job_share_partners: arrayRemove(partner)
      });

      // Add updated partner entry
      await updateDoc(companyRef, {
        job_share_partners: arrayUnion(updatedPartner)
      });

      toast({
        title: "Success",
        description: "Partner settings updated successfully!",
      });
      setEditingPartner(null);

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error updating partner:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to update partner settings: ${error.message}`,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditPartner = (partner) => {
    setEditingPartner(partner);
    const zones = partner.auto_assignment_zones || [];
    setZipCodes(zones[0]?.zip_codes?.join(', ') || '');
    setDefaultFee(zones[0]?.default_fee?.toString() || '');
    setAutoAssignEnabled(partner.auto_assignment_enabled || false);
    setRequiresAcceptance(partner.requires_acceptance !== undefined ? partner.requires_acceptance : false);
    setEmailNotifications(partner.email_notifications_enabled !== false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Job Share Partners
          </CardTitle>
          <CardDescription>
            Manage your trusted partners and configure auto-assignment rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No partners configured yet.</p>
              <p className="text-sm mt-2">
                Partners are automatically added when you share jobs or accept share requests.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {partners.map((partner, idx) => (
                <Card key={idx} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-3 flex-1">
                        <div>
                          <h4 className="font-semibold text-lg">
                            {partner.partner_company_name}
                          </h4>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">
                              {partner.partner_type}
                            </Badge>
                            <Badge
                              variant={partner.relationship_status === 'active' ? 'default' : 'secondary'}
                            >
                              {partner.relationship_status === 'active' ? (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1" />
                              )}
                              {partner.relationship_status}
                            </Badge>
                          </div>
                        </div>

                        <div className="text-sm space-y-1">
                          <p>
                            <span className="font-medium">Jobs Shared:</span>{' '}
                            {partner.total_jobs_shared || 0}
                          </p>
                          {partner.acceptance_rate !== undefined && (
                            <p>
                              <span className="font-medium">Acceptance Rate:</span>{' '}
                              {(partner.acceptance_rate * 100).toFixed(0)}%
                            </p>
                          )}
                          <p>
                            <span className="font-medium">Auto-Assign:</span>{' '}
                            {partner.auto_assignment_enabled ? (
                              <Badge variant="default" className="ml-2">Enabled</Badge>
                            ) : (
                              <Badge variant="secondary" className="ml-2">Disabled</Badge>
                            )}
                          </p>
                        </div>

                        {partner.auto_assignment_zones && partner.auto_assignment_zones.length > 0 && (
                          <div className="bg-muted p-3 rounded-md">
                            <p className="text-sm font-medium mb-1">Auto-Assignment Zones:</p>
                            {partner.auto_assignment_zones.map((zone, zoneIdx) => (
                              <div key={zoneIdx} className="text-sm space-y-1">
                                <p>
                                  <span className="font-medium">ZIP Codes:</span>{' '}
                                  {zone.zip_codes.join(', ')}
                                </p>
                                <p>
                                  <span className="font-medium">Default Fee:</span> ${zone.default_fee}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => handleEditPartner(partner)}
                        variant="outline"
                        size="sm"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Partner Dialog */}
      {editingPartner && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Edit Partner Settings: {editingPartner.partner_company_name}</CardTitle>
            <CardDescription>
              Configure auto-assignment rules and notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auto-Assignment Toggle */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Enable Auto-Assignment</label>
                <p className="text-sm text-muted-foreground">
                  Automatically share jobs matching ZIP codes below
                </p>
              </div>
              <Switch
                checked={autoAssignEnabled}
                onCheckedChange={setAutoAssignEnabled}
              />
            </div>

            {/* Auto-Assignment Configuration */}
            {autoAssignEnabled && (
              <div className="space-y-4 pl-6 border-l-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    ZIP Codes (comma-separated)
                  </label>
                  <Input
                    type="text"
                    value={zipCodes}
                    onChange={(e) => setZipCodes(e.target.value)}
                    placeholder="90210, 90211, 90212"
                  />
                  <p className="text-xs text-muted-foreground">
                    Jobs in these ZIP codes will be auto-shared with this partner
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Fee</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">$</span>
                    <Input
                      type="number"
                      value={defaultFee}
                      onChange={(e) => setDefaultFee(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="max-w-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Require Acceptance</label>
                    <p className="text-sm text-muted-foreground">
                      If disabled, jobs are automatically accepted
                    </p>
                  </div>
                  <Switch
                    checked={requiresAcceptance}
                    onCheckedChange={setRequiresAcceptance}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Email Notifications</label>
                    <p className="text-sm text-muted-foreground">
                      Send emails when jobs are auto-assigned
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => updatePartnerSettings(editingPartner.partner_company_id)}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingPartner(null)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PartnerManagement;
