import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Link2, Building2, User, DollarSign, CheckCircle2 } from 'lucide-react';

/**
 * JobShareChain Component
 * Displays the job sharing chain for a job, showing only what the current company should see
 *
 * @param {Object} job - The job object with job_share_chain data
 * @param {string} currentCompanyId - The ID of the current company viewing this job
 */
const JobShareChain = ({ job, currentCompanyId }) => {
  if (!job?.job_share_chain?.is_shared) {
    return null;
  }

  const chain = job.job_share_chain.chain || [];

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
  const isCurrentlyAssigned = job.job_share_chain.currently_assigned_to_company_id === currentCompanyId;

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
