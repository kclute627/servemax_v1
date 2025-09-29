
import React, { useState, useEffect } from 'react';
// FIREBASE TRANSITION: Replace with Firebase SDK imports.
import { ServerPayRecord, Employee } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HandCoins, Check, CreditCard } from 'lucide-react';
import { format } from "date-fns";

export default function ServerPayPage() {
  const [payData, setPayData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [paymentDetails, setPaymentDetails] = useState({
    method: 'check',
    reference: '',
    notes: ''
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    loadPayData();
  }, []);

  const loadPayData = async () => {
    setIsLoading(true);
    try {
      const [serverPayRecords, employees] = await Promise.all([
        ServerPayRecord.filter({ payment_status: 'unpaid' }),
        Employee.filter({ role: 'process_server' }),
      ]);

      console.log("Unpaid server pay records:", serverPayRecords.length);

      // Group records by server
      const serverPayData = employees.map(server => {
        const serverRecords = serverPayRecords.filter(record => 
          String(record.server_id) === String(server.id)
        );
        
        if (serverRecords.length === 0) return null;

        const totalOwed = serverRecords.reduce((sum, record) => sum + (record.total_amount || 0), 0);
        
        console.log(`Server ${server.first_name} ${server.last_name}:`, {
          id: server.id,
          records: serverRecords.length,
          totalOwed
        });
        
        return {
          server,
          records: serverRecords,
          totalOwed,
        };
      }).filter(Boolean).sort((a,b) => b.totalOwed - a.totalOwed);

      console.log("Server pay data:", serverPayData);
      setPayData(serverPayData);
    } catch (error) {
      console.error("Error loading server pay data:", error);
    }
    setIsLoading(false);
  };

  const openPaymentDialog = (records, isAllRecords = false) => {
    setSelectedRecords(records);
    setPaymentDetails({
      method: 'check',
      reference: '',
      notes: ''
    });
    setShowPaymentDialog(true);
  };
  
  const handleMarkAsPaid = async () => {
    setIsProcessingPayment(true);
    
    try {
      const paymentData = {
        payment_status: 'paid',
        payment_date: new Date().toISOString(),
        payment_method: paymentDetails.method,
        payment_reference: paymentDetails.reference,
        payment_notes: paymentDetails.notes
      };

      // Update all selected server pay records
      await Promise.all(
        selectedRecords.map(record => ServerPayRecord.update(record.id, paymentData))
      );
      
      setShowPaymentDialog(false);
      loadPayData(); // Refresh data
      
    } catch (error) {
      console.error("Failed to mark records as paid:", error);
      alert("Error updating payment status. Please try again.");
    }
    
    setIsProcessingPayment(false);
  };

  const getTotalPaymentAmount = () => {
    return selectedRecords.reduce((sum, record) => sum + (record.total_amount || 0), 0);
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
              {payData.map(({ server, records, totalOwed }) => (
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
                          <p className="text-sm text-slate-500 text-left">{records.length} unpaid job(s)</p>
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
                            openPaymentDialog(records, true);
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
                          <th className="py-2 px-2 font-medium">Created Date</th>
                          <th className="py-2 px-2 font-medium">Amount</th>
                          <th className="py-2 px-2 font-medium">Pay Items</th>
                          <th className="py-2 px-2 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map(record => (
                          <tr key={record.id} className="border-b border-slate-100 last:border-b-0">
                            <td className="py-3 px-2 font-medium text-slate-700">{record.job_number}</td>
                            <td className="py-3 px-2 text-slate-600">{format(new Date(record.created_date), "MMM d, yyyy")}</td>
                            <td className="py-3 px-2 font-semibold text-slate-800">${(record.total_amount || 0).toFixed(2)}</td>
                            <td className="py-3 px-2 text-slate-600">
                              {record.pay_items && record.pay_items.length > 0 ? (
                                <div className="text-xs space-y-1">
                                  {record.pay_items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between">
                                      <span>{item.description}</span>
                                      <span>${(item.total || 0).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">No breakdown</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-2"
                                onClick={() => openPaymentDialog([record])}
                              >
                                <CreditCard className="w-3 h-3" />
                                Mark Paid
                              </Button>
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

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                {selectedRecords.length > 1 
                  ? `Marking ${selectedRecords.length} jobs as paid` 
                  : `Job: ${selectedRecords[0]?.job_number || 'N/A'}`
                }
              </p>
              <p className="text-lg font-bold text-slate-900">
                Total: ${getTotalPaymentAmount().toFixed(2)}
              </p>
            </div>

            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <select
                id="payment_method"
                value={paymentDetails.method}
                onChange={(e) => setPaymentDetails(prev => ({...prev, method: e.target.value}))}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="check">Check</option>
                <option value="direct_deposit">Direct Deposit</option>
                <option value="cash">Cash</option>
                <option value="venmo">Venmo</option>
                <option value="zelle">Zelle</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <Label htmlFor="payment_reference">
                {paymentDetails.method === 'check' ? 'Check Number' : 
                 paymentDetails.method === 'direct_deposit' ? 'Transaction ID' :
                 paymentDetails.method === 'venmo' ? 'Venmo Username' :
                 paymentDetails.method === 'zelle' ? 'Zelle Reference' :
                 'Reference Number'}
              </Label>
              <Input
                id="payment_reference"
                value={paymentDetails.reference}
                onChange={(e) => setPaymentDetails(prev => ({...prev, reference: e.target.value}))}
                placeholder={paymentDetails.method === 'check' ? 'Enter check number' : 'Enter reference'}
              />
            </div>

            <div>
              <Label htmlFor="payment_notes">Notes (Optional)</Label>
              <Textarea
                id="payment_notes"
                value={paymentDetails.notes}
                onChange={(e) => setPaymentDetails(prev => ({...prev, notes: e.target.value}))}
                placeholder="Additional payment notes..."
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowPaymentDialog(false)}
                disabled={isProcessingPayment}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleMarkAsPaid}
                disabled={isProcessingPayment}
                className="gap-2"
              >
                {isProcessingPayment ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Mark as Paid
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
