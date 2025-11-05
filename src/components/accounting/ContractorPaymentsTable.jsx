import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HardHat, Check, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { ServerPayRecord, Employee } from '@/api/entities';
import { useGlobalData } from '@/components/GlobalDataContext';

export default function ContractorPaymentsTable({ serverPayRecords, isLoading }) {
  const { refreshData } = useGlobalData();
  const [contractors, setContractors] = useState([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [paymentDetails, setPaymentDetails] = useState({
    method: 'check',
    reference: '',
    notes: ''
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Filter for unpaid contractor records only
  const unpaidContractorRecords = useMemo(() => {
    return serverPayRecords.filter(
      record => record.payment_status === 'unpaid' && record.server_type === 'contractor'
    );
  }, [serverPayRecords]);

  // Load contractors and group records by contractor
  React.useEffect(() => {
    const loadContractors = async () => {
      try {
        const allEmployees = await Employee.list();
        const contractorsList = allEmployees.filter(e => e.role === 'contractor');
        setContractors(contractorsList);
      } catch (error) {
        console.error('Error loading contractors:', error);
      }
    };
    loadContractors();
  }, []);

  // Group records by contractor
  const payData = useMemo(() => {
    // Get unique contractor IDs from records
    const contractorIds = [...new Set(unpaidContractorRecords.map(r => r.server_id))];

    const contractorPayData = contractorIds.map(contractorId => {
      const contractorRecords = unpaidContractorRecords.filter(record =>
        String(record.server_id) === String(contractorId)
      );

      if (contractorRecords.length === 0) return null;

      // Find contractor info - use server_name from record if contractor not in list
      const contractor = contractors.find(c => String(c.id) === String(contractorId));
      const contractorInfo = contractor || {
        id: contractorId,
        company_name: contractorRecords[0]?.server_name || 'Unknown Contractor',
        first_name: '',
        last_name: ''
      };

      const totalOwed = contractorRecords.reduce((sum, record) => sum + (record.total_amount || 0), 0);

      return {
        contractor: contractorInfo,
        records: contractorRecords,
        totalOwed,
      };
    }).filter(Boolean).sort((a, b) => b.totalOwed - a.totalOwed);

    return contractorPayData;
  }, [unpaidContractorRecords, contractors]);

  const openPaymentDialog = (records) => {
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

      // Update all selected contractor payment records
      await Promise.all(
        selectedRecords.map(record => ServerPayRecord.update(record.id, paymentData))
      );

      setShowPaymentDialog(false);
      refreshData(); // Refresh global data

    } catch (error) {
      console.error('Failed to mark records as paid:', error);
      alert('Error updating payment status. Please try again.');
    }

    setIsProcessingPayment(false);
  };

  const getTotalPaymentAmount = () => {
    return selectedRecords.reduce((sum, record) => sum + (record.total_amount || 0), 0);
  };

  const getContractorInitials = (contractor) => {
    if (contractor.company_name) {
      const words = contractor.company_name.split(' ');
      if (words.length >= 2) {
        return words[0].charAt(0) + words[1].charAt(0);
      }
      return contractor.company_name.substring(0, 2).toUpperCase();
    }
    return (contractor.first_name?.charAt(0) || '') + (contractor.last_name?.charAt(0) || '');
  };

  const getContractorDisplayName = (contractor) => {
    return contractor.company_name || `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() || 'Unknown Contractor';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (payData.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HardHat className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">All Caught Up!</h3>
          <p className="text-slate-500">There are no outstanding payments for contractors.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Accordion type="multiple" className="space-y-4">
        {payData.map(({ contractor, records, totalOwed }) => (
          <AccordionItem key={contractor.id} value={String(contractor.id)} className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-600 font-semibold text-sm">
                      {getContractorInitials(contractor)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-left">{getContractorDisplayName(contractor)}</p>
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
                      openPaymentDialog(records);
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
                      <td className="py-3 px-2 text-slate-600">{record.created_at ? format(new Date(record.created_at), 'MMM d, yyyy') : 'N/A'}</td>
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
    </>
  );
}
