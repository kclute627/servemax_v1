import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  DirectorySearch,
  PartnerManagement,
  PendingShareRequests,
  JobShareChain
} from '../components/JobSharing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

/**
 * Job Sharing Test Page
 *
 * This page allows you to test all job sharing components in one place.
 * Navigate to /test/job-sharing to access this page.
 */
const JobSharingTest = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mock test job for JobShareChain component
  const [testJob] = useState({
    id: 'test-job-1',
    addresses: [{
      address1: '123 Beverly Dr',
      city: 'Beverly Hills',
      state: 'CA',
      postal_code: '90210'
    }],
    job_share_chain: {
      is_shared: true,
      currently_assigned_to_company_id: 'your-company-id', // Replace with actual ID
      chain: [
        {
          level: 0,
          company_id: 'company-a',
          company_name: 'Test Company A',
          user_id: 'user-a',
          user_name: 'John Doe',
          shared_with_company_id: 'your-company-id',
          shared_with_user_id: 'your-user-id',
          invoice_amount: 100,
          sees_client_as: 'Original Client LLC',
          auto_assigned: false
        },
        {
          level: 1,
          company_id: 'your-company-id',
          company_name: 'Your Company',
          user_id: 'your-user-id',
          shared_with_company_id: null,
          shared_with_user_id: null,
          invoice_amount: 75,
          sees_client_as: 'Test Company A - Process Serving',
          auto_assigned: true
        }
      ],
      total_levels: 1
    }
  });

  useEffect(() => {
    // Load current user and company data
    const loadData = async () => {
      try {
        // Get current user from Firebase Auth
        const auth = await import('../firebase/config').then(m => m.auth);
        const user = auth.currentUser;

        if (user) {
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            company_id: user.company_id || 'test-company-id' // Fallback for testing
          });

          // Load company data
          const companyId = user.company_id || 'test-company-id';
          const companyDoc = await getDoc(doc(db, 'companies', companyId));

          if (companyDoc.exists()) {
            setCompany({
              id: companyDoc.id,
              ...companyDoc.data()
            });
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading test environment...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Job Sharing Feature - Test Page</h1>
        <p className="text-muted-foreground">
          Test all job sharing components and functionality in one place
        </p>
      </div>

      {/* Status Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Test Mode:</strong> This page is for testing the job sharing feature.
          Some components use mock data. Check the console for detailed logs.
        </AlertDescription>
      </Alert>

      {/* Current User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium text-muted-foreground">User ID</div>
              <div className="font-mono">{currentUser?.uid || 'Not logged in'}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Company ID</div>
              <div className="font-mono">{currentUser?.company_id || 'N/A'}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Partners Configured</div>
              <div className="font-semibold">
                {company?.job_share_partners?.length || 0}
                {company?.job_share_partners?.length > 0 && (
                  <Badge variant="default" className="ml-2">Active</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            Pending Requests
          </TabsTrigger>
          <TabsTrigger value="partners">
            Partner Management
          </TabsTrigger>
          <TabsTrigger value="search">
            Directory Search
          </TabsTrigger>
          <TabsTrigger value="chain">
            Job Chain Display
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Pending Requests */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test: Pending Share Requests Component</CardTitle>
              <CardDescription>
                This component shows real-time pending job share requests sent to your company.
                Create test requests in Firestore to see them appear here.
              </CardDescription>
            </CardHeader>
          </Card>

          <PendingShareRequests companyId={currentUser?.company_id} />

          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>How to test:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Create a share request from another company</li>
                <li>Watch it appear here in real-time</li>
                <li>Click Accept/Decline to test responses</li>
                <li>Check Firestore to verify status updates</li>
              </ol>
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Tab 2: Partner Management */}
        <TabsContent value="partners" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test: Partner Management Component</CardTitle>
              <CardDescription>
                Configure trusted partners and auto-assignment rules. Changes are saved to Firestore.
              </CardDescription>
            </CardHeader>
          </Card>

          <PartnerManagement
            companyId={currentUser?.company_id}
            partners={company?.job_share_partners || []}
          />

          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>How to test:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Add a partner to your company document in Firestore</li>
                <li>Refresh this page to see the partner</li>
                <li>Click "Edit Settings" to modify configuration</li>
                <li>Enable auto-assignment and add ZIP codes</li>
                <li>Verify changes persist in Firestore</li>
              </ol>
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Tab 3: Directory Search */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test: Directory Search Component</CardTitle>
              <CardDescription>
                Search for companies by ZIP code and send job share requests.
              </CardDescription>
            </CardHeader>
          </Card>

          <DirectorySearch
            jobId="test-job-123"
            jobZipCode="90210"
            onShareRequest={() => {
              alert('Share request sent successfully!');
              console.log('Share request callback triggered');
            }}
          />

          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>How to test:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Enter a ZIP code that has companies in your directory</li>
                <li>Click Search to see results</li>
                <li>Select a company and enter a fee amount</li>
                <li>Choose expiration time and send request</li>
                <li>Check Firestore for new job_share_request document</li>
                <li>Verify Cloud Function logs show request creation</li>
              </ol>
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Tab 4: Job Chain Display */}
        <TabsContent value="chain" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test: Job Share Chain Component</CardTitle>
              <CardDescription>
                This shows how the job sharing chain appears on job details.
                Using mock data for demonstration.
              </CardDescription>
            </CardHeader>
          </Card>

          <JobShareChain
            job={testJob}
            currentCompanyId={currentUser?.company_id || 'your-company-id'}
          />

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>How to test with real data:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Share a real job with another company</li>
                <li>Navigate to that job's details page</li>
                <li>Add the JobShareChain component there</li>
                <li>Verify it shows only adjacent chain levels</li>
                <li>Test with multi-level chains (A → B → C)</li>
                <li>Verify each company sees correct privacy levels</li>
              </ol>
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      {/* Debug Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Debug Information</CardTitle>
          <CardDescription>Current state for debugging</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="font-medium mb-2">Current User</div>
              <pre className="text-xs bg-slate-100 p-4 rounded overflow-auto">
                {JSON.stringify(currentUser, null, 2)}
              </pre>
            </div>

            <div>
              <div className="font-medium mb-2">Company Data</div>
              <pre className="text-xs bg-slate-100 p-4 rounded overflow-auto">
                {JSON.stringify({
                  id: company?.id,
                  name: company?.name,
                  partners_count: company?.job_share_partners?.length || 0,
                  partners: company?.job_share_partners
                }, null, 2)}
              </pre>
            </div>

            <div>
              <div className="font-medium mb-2">Test Job (Mock Data)</div>
              <pre className="text-xs bg-slate-100 p-4 rounded overflow-auto">
                {JSON.stringify(testJob, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Testing Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Test Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="test1" />
              <label htmlFor="test1">Cloud Functions deployed successfully</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="test2" />
              <label htmlFor="test2">Firestore rules deployed</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="test3" />
              <label htmlFor="test3">Test companies created in Firestore</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="test4" />
              <label htmlFor="test4">Partner relationship configured</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="test5" />
              <label htmlFor="test5">Auto-assignment tested with real job</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="test6" />
              <label htmlFor="test6">Manual share request sent and accepted</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="test7" />
              <label htmlFor="test7">Privacy verification (chain visibility)</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="test8" />
              <label htmlFor="test8">Cloud Function logs reviewed</label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobSharingTest;
