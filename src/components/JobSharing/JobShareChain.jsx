import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Link2, Building2, User, DollarSign, CheckCircle2, Copy, ArrowDown, ArrowUp } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';

/**
 * JobShareChain Component
 * Displays the job sharing chain for a job, showing only what the current company should see
 * Supports both legacy job_share_chain and new share_chain (carbon copy) structures
 *
 * @param {Object} job - The job object with job_share_chain or share_chain data
 * @param {string} currentCompanyId - The ID of the current company viewing this job
 */
const JobShareChain = ({ job, currentCompanyId }) => {
  const [parentCompanyName, setParentCompanyName] = useState(null);
  const [childCompanyName, setChildCompanyName] = useState(null);

  // Check for carbon copy share_chain first (new structure)
  const shareChain = job?.share_chain;
  const isCarbonCopy = shareChain && (shareChain.parent_job_id || shareChain.child_job_id || shareChain.level > 0);

  // Legacy job_share_chain check
  const legacyChain = job?.job_share_chain;
  const isLegacyShared = legacyChain?.is_shared;

  // Load company names for carbon copy chain
  useEffect(() => {
    const loadCompanyNames = async () => {
      if (!isCarbonCopy) return;

      if (shareChain.parent_company_id) {
        try {
          const companyDoc = await getDoc(doc(db, 'companies', shareChain.parent_company_id));
          if (companyDoc.exists()) {
            setParentCompanyName(companyDoc.data().company_name || companyDoc.data().name || 'Unknown Company');
          }
        } catch (error) {
          console.error('Error loading parent company:', error);
        }
      }

      if (shareChain.child_company_id) {
        try {
          const companyDoc = await getDoc(doc(db, 'companies', shareChain.child_company_id));
          if (companyDoc.exists()) {
            setChildCompanyName(companyDoc.data().company_name || companyDoc.data().name || 'Unknown Company');
          }
        } catch (error) {
          console.error('Error loading child company:', error);
        }
      }
    };

    loadCompanyNames();
  }, [isCarbonCopy, shareChain?.parent_company_id, shareChain?.child_company_id]);

  // Render carbon copy chain (new structure)
  if (isCarbonCopy) {
    return (
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Job Sharing Chain
            <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-700">
              Job #{shareChain.shared_job_number}
            </Badge>
          </CardTitle>
          <CardDescription>
            This is a {shareChain.level === 0 ? 'shared job (original)' : 'carbon copy job'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Parent Company (who shared to us) */}
            {shareChain.parent_company_id && (
              <div className="p-4 rounded-lg border-2 border-gray-200 bg-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-gray-200">
                    <ArrowDown className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">
                      {parentCompanyName || 'Loading...'}
                    </h4>
                    <Badge variant="outline" className="mt-1">
                      Shared from (Your Client)
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Current Company */}
            <div className="p-4 rounded-lg border-2 border-purple-500 bg-purple-50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-500">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Your Company</h4>
                    <Badge variant="default" className="mt-1">
                      Level {shareChain.level} in chain
                    </Badge>
                  </div>
                </div>
                {shareChain.sync_enabled && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Status Sync Active
                  </Badge>
                )}
              </div>
              <div className="mt-3 ml-11 space-y-2">
                {job.service_fee !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-gray-600">Your Fee:</span>
                    <span className="font-semibold text-green-600">
                      ${(job.service_fee || 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Child Company (who we shared to) */}
            {shareChain.child_company_id && (
              <div className="p-4 rounded-lg border-2 border-gray-200 bg-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-gray-200">
                    <ArrowUp className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">
                      {childCompanyName || 'Loading...'}
                    </h4>
                    <Badge variant="outline" className="mt-1">
                      Shared to (Your Subcontractor)
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Chain info */}
            {shareChain.all_job_ids?.length > 1 && (
              <div className="text-center text-sm text-muted-foreground">
                <Separator className="mb-3" />
                This job is shared across {shareChain.all_job_ids.length} companies
              </div>
            )}

            {/* Status sync notice */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">
              <strong>Status Sync:</strong> When this job's status changes, all companies in the chain will be automatically updated.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render legacy chain (existing structure)
  if (!isLegacyShared) {
    return null;
  }

  const chain = legacyChain.chain || [];

  // Find what level the current company is at
  const currentLevel = chain.findIndex(c => c.company_id === currentCompanyId);

  if (currentLevel === -1) {
    // Current company is not in the chain, shouldn't see this job
    return null;
  }

  // Only show what this company should see:
  // - One level up (their client)
  // - Their own level
  // - One level down (their server, if exists)
  const visibleChain = chain.slice(
    Math.max(0, currentLevel - 1),
    currentLevel + 2
  );

  const currentCompanyEntry = chain[currentLevel];
  const isCurrentlyAssigned = legacyChain.currently_assigned_to_company_id === currentCompanyId;

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Job Sharing Information
        </CardTitle>
        <CardDescription>
          This job is part of a job sharing chain
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {visibleChain.map((level, idx) => {
            const isCurrentCompany = level.company_id === currentCompanyId;
            const isClient = level.level < currentLevel;
            const isServer = level.level > currentLevel;

            return (
              <div
                key={idx}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${isCurrentCompany
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`
                      p-2 rounded-full
                      ${isCurrentCompany ? 'bg-blue-500' : 'bg-gray-200'}
                    `}>
                      <Building2 className={`h-4 w-4 ${isCurrentCompany ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">
                        {isCurrentCompany ? 'You' : level.company_name}
                      </h4>
                      {isClient && (
                        <Badge variant="outline" className="mt-1">
                          Your Client
                        </Badge>
                      )}
                      {isServer && (
                        <Badge variant="outline" className="mt-1">
                          Your Server
                        </Badge>
                      )}
                    </div>
                  </div>

                  {isCurrentCompany && isCurrentlyAssigned && (
                    <Badge variant="default">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Currently Assigned
                    </Badge>
                  )}
                </div>

                {isCurrentCompany && (
                  <div className="space-y-2 ml-11">
                    {level.sees_client_as && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">Client:</span>
                        <span className="font-medium">{level.sees_client_as}</span>
                      </div>
                    )}

                    {level.invoice_amount !== undefined && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-gray-600">Your Fee:</span>
                        <span className="font-semibold text-green-600">
                          ${level.invoice_amount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {level.auto_assigned && (
                      <Badge variant="secondary" className="text-xs">
                        Auto-Assigned
                      </Badge>
                    )}
                  </div>
                )}

                {!isCurrentCompany && (
                  <div className="ml-11 text-sm text-gray-600">
                    {isClient ? 'Shared this job with you' : 'Serving on your behalf'}
                  </div>
                )}
              </div>
            );
          })}

          {chain.length > visibleChain.length && (
            <div className="text-center text-sm text-muted-foreground">
              <Separator className="mb-3" />
              This job has been shared {chain.length - 1} time{chain.length - 1 !== 1 ? 's' : ''}
            </div>
          )}

          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <strong>Privacy Protection:</strong> You can only see companies directly connected to you in the sharing chain.
            The original client information and other intermediate parties are protected.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobShareChain;
