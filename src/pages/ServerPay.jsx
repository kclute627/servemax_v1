
// FIREBASE TRANSITION: Data aggregation page.
// - `loadPayData`: Replace `Job.list()` and `Employee.filter()` with `getDocs` calls. The filtering and aggregation logic will happen on the client-side as it does now, which is acceptable for moderate amounts of data. For very large datasets, you might consider a Cloud Function to pre-aggregate this data.
// - `handleMarkAsPaid`: Will use a Firestore `writeBatch` to update the `server_payment_status` on multiple job documents at once.

import React, { useState, useEffect } from 'react';
// FIREBASE TRANSITION: Replace with Firebase SDK imports.
import { Job, Employee } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HandCoins, Check } from 'lucide-react';
import { format } from "date-fns";

export default function ServerPayPage() {
  const [payData, setPayData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPayData();
  }, []);

  const loadPayData = async () => {
    // FIREBASE TRANSITION: Replace `Job.list()` and `Employee.filter()` with `getDocs` calls.
    // The filtering and aggregation logic will happen on the client-side as it does now, which is acceptable for moderate amounts of data.
    // For very large datasets, you might consider a Cloud Function to pre-aggregate this data.
    setIsLoading(true);
    try {
      const [jobs, employees] = await Promise.all([
        Job.list(),
        Employee.filter({ role: 'process_server' }),
      ]);

      const unpaidJobs = jobs.filter(job => job.server_payment_status === 'unpaid' && job.assigned_server_id && job.total_server_pay > 0);

      const serverPayData = employees.map(server => {
        const serverJobs = unpaidJobs.filter(job => job.assigned_server_id === server.id);
        if (serverJobs.length === 0) return null;

        const totalOwed = serverJobs.reduce((sum, job) => sum + (job.total_server_pay || 0), 0);
        
        return {
          server,
          jobs: serverJobs,
          totalOwed,
        };
      }).filter(Boolean).sort((a,b) => b.totalOwed - a.totalOwed);

      setPayData(serverPayData);
    } catch (error) {
      console.error("Error loading server pay data:", error);
    }
    setIsLoading(false);
  };
  
  const handleMarkAsPaid = async (jobIds) => {
    // FIREBASE TRANSITION: Will use a Firestore `writeBatch` to update the `server_payment_status` on multiple job documents at once.
    // In a real app, this would likely be a bulk update.
    // For now, we update one by one.
    try {
      await Promise.all(
        jobIds.map(id => Job.update(id, { server_payment_status: 'paid' }))
      );
      loadPayData(); // Refresh data
    } catch (error) {
      console.error("Failed to mark jobs as paid:", error);
      alert("Error updating payment status.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Server Pay</h1>
              <p className="text-slate-600">Track and manage payments owed to process servers.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : payData.length === 0 ? (
             <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <HandCoins className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">All Caught Up!</h3>
                  <p className="text-slate-500">There are no outstanding payments for servers.</p>
                </CardContent>
              </Card>
          ) : (
            <Accordion type="multiple" className="space-y-4">
              {payData.map(({ server, jobs, totalOwed }) => (
                <AccordionItem key={server.id} value={server.id} className="bg-white border border-slate-200 rounded-lg shadow-sm">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-slate-600 font-semibold text-sm">
                            {(server.first_name?.charAt(0) || '') + (server.last_name?.charAt(0) || '')}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-left">{server.first_name} {server.last_name}</p>
                          <p className="text-sm text-slate-500 text-left">{jobs.length} unpaid job(s)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-sm text-slate-500 text-right">Total Owed</p>
                          <p className="text-xl font-bold text-slate-900">${totalOwed.toFixed(2)}</p>
                        </div>
                        <Button 
                          size="sm" 
                          className="gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsPaid(jobs.map(j => j.id));
                          }}
                        >
                          <Check className="w-4 h-4"/> Mark All Paid
                        </Button>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 border-t border-slate-200">
                    <table className="w-full text-sm mt-4">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="py-2 px-2 font-medium">Job #</th>
                          <th className="py-2 px-2 font-medium">Completed</th>
                          <th className="py-2 px-2 font-medium">Amount</th>
                          <th className="py-2 px-2 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map(job => (
                          <tr key={job.id} className="border-b border-slate-100 last:border-b-0">
                            <td className="py-3 px-2 font-medium text-slate-700">{job.job_number}</td>
                            <td className="py-3 px-2 text-slate-600">{job.service_date ? format(new Date(job.service_date), "MMM d, yyyy") : 'N/A'}</td>
                            <td className="py-3 px-2 font-semibold text-slate-800">${(job.total_server_pay || 0).toFixed(2)}</td>
                            <td className="py-3 px-2 text-right">
                              <Button variant="outline" size="sm" onClick={() => handleMarkAsPaid([job.id])}>Mark Paid</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </div>
  );
}
