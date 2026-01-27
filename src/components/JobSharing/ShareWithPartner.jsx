import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, functions } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/use-toast';
import { Loader2, Users, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';

const ShareWithPartner = ({ jobId, onShareRequest }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [proposedFee, setProposedFee] = useState('');
  const [expiresIn, setExpiresIn] = useState('24');
  const [sending, setSending] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);

  useEffect(() => {
    if (!user?.company_id) return;

    const fetchPartners = async () => {
      try {
        // Query partner client records from companies collection
        const partnersSnapshot = await getDocs(
          query(
            collection(db, 'companies'),
            where('created_by', '==', user.company_id),
            where('is_job_share_partner', '==', true),
            where('relationship_status', '==', 'active')
          )
        );
        const partnersList = partnersSnapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));
        setPartners(partnersList);
      } catch (error) {
        console.error('Error fetching partners:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load partners",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPartners();
  }, [user?.company_id]);

  const handleSelectPartner = (partner) => {
    setSelectedPartner(partner);

    // Pre-fill fee from partner's default or $75
    const defaultFee = partner.auto_assignment_zones?.[0]?.default_fee || 75;
    setProposedFee(defaultFee.toString());
    setShowCustomize(false);
  };

  const sendShareRequest = async () => {
    if (!selectedPartner || !proposedFee) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a partner and enter a fee",
      });
      return;
    }

    // Need to get the partner's user_id
    setSending(true);
    try {
      // Fetch partner company to get a user
      const partnerCompanyDoc = await getDoc(doc(db, 'companies', selectedPartner.job_sharing_partner_id));
      if (!partnerCompanyDoc.exists()) {
        throw new Error('Partner company not found');
      }

      const partnerCompany = partnerCompanyDoc.data();
      let targetUserId = partnerCompany.owner_id || partnerCompany.created_by;

      // Fallback to users array
      if (!targetUserId && partnerCompany.users && partnerCompany.users.length > 0) {
        const adminUser = partnerCompany.users.find(u => u.role === 'admin' || u.employee_role === 'admin');
        targetUserId = adminUser ? adminUser.id : partnerCompany.users[0].id;
      }

      if (!targetUserId) {
        throw new Error('Could not find user for partner company');
      }

      const createRequest = httpsCallable(functions, 'createJobShareRequest');
      await createRequest({
        jobId,
        targetCompanyId: selectedPartner.job_sharing_partner_id,
        targetUserId,
        proposedFee: parseFloat(proposedFee),
        expiresInHours: expiresIn === 'none' ? null : parseInt(expiresIn)
      });

      toast({
        title: "Request Sent",
        description: `Job share request sent to ${selectedPartner.company_name || selectedPartner.name}!`,
      });
      setSelectedPartner(null);
      setProposedFee('');
      setExpiresIn('24');
      setShowCustomize(false);

      if (onShareRequest) {
        onShareRequest();
      }
    } catch (error) {
      console.error('Share request error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to send share request: ${error.message}`,
      });
    } finally {
      setSending(false);
    }
  };

  const getExpirationLabel = () => {
    if (expiresIn === '1') return '1 hour';
    if (expiresIn === '24') return '24 hours';
    return 'never expires';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (partners.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No partners yet</p>
        <p className="text-sm mt-1">
          Establish partnerships first before you can share jobs
        </p>
        <p className="text-sm">
          Go to Settings → Job Sharing to find partners
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share Job with Partner
          </CardTitle>
          <CardDescription>
            Select a trusted partner to share this job with
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedPartner ? (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                You have {partners.length} active {partners.length === 1 ? 'partner' : 'partners'}
              </p>
              <div className="grid gap-3">
                {partners.map((partner) => (
                  <Card
                    key={partner.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleSelectPartner(partner)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold">{partner.company_name || partner.name}</h4>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{partner.company_type}</Badge>
                            {partner.total_jobs_shared > 0 && (
                              <Badge variant="secondary">
                                {partner.total_jobs_shared} jobs shared
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Select
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  Sharing with: <span className="text-primary">{selectedPartner.company_name || selectedPartner.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomize(!showCustomize)}
                  className="gap-2"
                >
                  {showCustomize ? (
                    <>
                      Hide Details <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Customize <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              {/* Default values display */}
              {!showCustomize && (
                <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Fee:</span>
                    <span className="font-semibold">${proposedFee}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Expires in:</span>
                    <span className="font-semibold">{getExpirationLabel()}</span>
                  </div>
                </div>
              )}

              {/* Customization form */}
              {showCustomize && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Your Fee to {selectedPartner.company_name || selectedPartner.name}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">$</span>
                      <Input
                        type="number"
                        value={proposedFee}
                        onChange={(e) => setProposedFee(e.target.value)}
                        placeholder="Enter amount"
                        min="0"
                        step="0.01"
                        className="max-w-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Request Expires In</label>
                    <Select value={expiresIn} onValueChange={setExpiresIn}>
                      <SelectTrigger className="max-w-xs">
                        <SelectValue placeholder="24 Hours" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Hour</SelectItem>
                        <SelectItem value="24">24 Hours</SelectItem>
                        <SelectItem value="none">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={sendShareRequest}
                  disabled={sending}
                  className="flex-1"
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    `Send Request - $${proposedFee} (${getExpirationLabel()})`
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedPartner(null)}
                  disabled={sending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareWithPartner;
