import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { DollarSign, AlertCircle, Send, FileText, Calendar, ChevronDown } from 'lucide-react';
import { DATE_RANGE_OPTIONS, isDateInRange, formatDateRange } from '@/utils/dateRangeHelpers';

// Animated number component that smoothly transitions between values
function AnimatedValue({ value, className }) {
  const [displayed, setDisplayed] = useState(value);
  const [fading, setFading] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setFading(true);
      const timer = setTimeout(() => {
        setDisplayed(value);
        setFading(false);
      }, 150);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <div
      className={`${className} transition-all duration-300 ease-in-out ${
        fading ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
      }`}
    >
      {displayed}
    </div>
  );
}

const StatCard = ({ title, value, icon, description, isLoading, count }) => {
  const Icon = icon;
  return (
    <Card className="shadow-sm border-0 transition-all duration-300 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        <Icon className="h-5 w-5 text-slate-400" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-3/4 mt-1" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </>
        ) : (
          <>
            <AnimatedValue value={value} className="text-2xl font-bold text-slate-900" />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-slate-500 transition-all duration-300">{description}</p>
              {count !== undefined && (
                <AnimatedValue
                  value={`${count} ${count === 1 ? 'invoice' : 'invoices'}`}
                  className="text-xs font-medium text-slate-600"
                />
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

function getEffectiveStatus(inv) {
  const status = inv.status?.toLowerCase() || 'draft';
  const total = inv.total_amount || inv.total || 0;
  const paid = inv.amount_paid || inv.total_paid || 0;
  if (paid > 0 && total > 0 && paid >= total) return 'paid';
  if (paid > 0 && total > 0 && paid < total) return 'partially_paid';
  return status;
}

function safeNumber(val) {
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? 0 : num;
}

const datePresets = [
  { key: DATE_RANGE_OPTIONS.TODAY, label: 'Today' },
  { key: DATE_RANGE_OPTIONS.YESTERDAY, label: 'Yesterday' },
  { key: DATE_RANGE_OPTIONS.THIS_WEEK, label: 'This Week' },
  { key: DATE_RANGE_OPTIONS.THIS_MONTH, label: 'This Month' },
  { key: DATE_RANGE_OPTIONS.LAST_MONTH, label: 'Last Month' },
  { key: DATE_RANGE_OPTIONS.ALL_TIME, label: 'All Time' },
];

export default function AccountingStats({ invoices, isLoading, dateRange, onDateRangeChange }) {
  const [showCustom, setShowCustom] = useState(
    typeof dateRange === 'object' && dateRange?.type === 'custom'
  );
  const [customStart, setCustomStart] = useState(
    typeof dateRange === 'object' ? dateRange?.start || '' : ''
  );
  const [customEnd, setCustomEnd] = useState(
    typeof dateRange === 'object' ? dateRange?.end || '' : ''
  );

  const isCustomActive = typeof dateRange === 'object' && dateRange?.type === 'custom';
  const activePresetKey = typeof dateRange === 'string' ? dateRange : null;

  const handlePresetClick = (key) => {
    setShowCustom(false);
    onDateRangeChange(key);
  };

  const handleCustomToggle = () => {
    setShowCustom(!showCustom);
    if (!showCustom && !isCustomActive) {
      // Set defaults to this month
      const now = new Date();
      const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const end = now.toISOString().split('T')[0];
      setCustomStart(start);
      setCustomEnd(end);
    }
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onDateRangeChange({ type: 'custom', start: customStart, end: customEnd });
    }
  };

  // Auto-apply when both dates are set
  useEffect(() => {
    if (showCustom && customStart && customEnd && customStart <= customEnd) {
      onDateRangeChange({ type: 'custom', start: customStart, end: customEnd });
    }
  }, [customStart, customEnd]);

  const stats = React.useMemo(() => {
    if (!invoices || invoices.length === 0) {
      return {
        totalIssued: 0, issuedCount: 0,
        totalPaid: 0, paidCount: 0,
        outstandingBalance: 0, outstandingCount: 0,
        draftTotal: 0, draftCount: 0
      };
    }

    const allActive = invoices.filter(inv => inv.status?.toLowerCase() !== 'cancelled');

    const issuedInvoices = allActive.filter(inv => {
      const eff = getEffectiveStatus(inv);
      return ['issued', 'sent', 'overdue'].includes(eff);
    });
    const totalIssued = issuedInvoices.reduce((sum, inv) => sum + safeNumber(inv.total_amount || inv.total), 0);

    let paidInvoices = allActive.filter(inv => getEffectiveStatus(inv) === 'paid');
    const isAllTime = dateRange === DATE_RANGE_OPTIONS.ALL_TIME || !dateRange;
    if (!isAllTime) {
      paidInvoices = paidInvoices.filter(inv => {
        const paymentDate = inv.paid_date || inv.payment_date || inv.updated_at || inv.invoice_date;
        return isDateInRange(paymentDate, dateRange);
      });
    }
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + safeNumber(inv.amount_paid || inv.total_paid || inv.total_amount || inv.total), 0);

    const outstandingInvoices = allActive.filter(inv => {
      const eff = getEffectiveStatus(inv);
      return eff !== 'paid' && eff !== 'draft';
    });
    const outstandingBalance = outstandingInvoices.reduce((sum, inv) => {
      const total = safeNumber(inv.total_amount || inv.total);
      const paid = safeNumber(inv.amount_paid || inv.total_paid);
      const balance = safeNumber(inv.balance_due);
      const effectiveBalance = (balance > 0 && balance <= total) ? balance : (total - paid);
      return sum + Math.max(0, effectiveBalance);
    }, 0);

    const draftInvoices = allActive.filter(inv => getEffectiveStatus(inv) === 'draft');
    const draftTotal = draftInvoices.reduce((sum, inv) => sum + safeNumber(inv.total_amount || inv.total), 0);

    return {
      totalIssued, issuedCount: issuedInvoices.length,
      totalPaid, paidCount: paidInvoices.length,
      outstandingBalance, outstandingCount: outstandingInvoices.length,
      draftTotal, draftCount: draftInvoices.length
    };
  }, [invoices, dateRange]);

  const fmt = (val) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const periodLabel = (() => {
    if (isCustomActive) return formatDateRange(dateRange);
    if (dateRange && dateRange !== DATE_RANGE_OPTIONS.ALL_TIME) return formatDateRange(dateRange);
    return 'Received payments';
  })();

  return (
    <div className="space-y-4">
      {/* Date Range Selector */}
      {onDateRangeChange && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-sm font-medium text-slate-600 mr-1">Period:</span>
            {datePresets.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handlePresetClick(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                  activePresetKey === key
                    ? 'bg-slate-900 text-white shadow-sm scale-105'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={handleCustomToggle}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 flex items-center gap-1 ${
                isCustomActive || showCustom
                  ? 'bg-slate-900 text-white shadow-sm scale-105'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              Custom
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showCustom ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Custom Date Range Inputs */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              showCustom ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="flex items-center gap-3 pl-6">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-500">From</label>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-40 h-8 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-500">To</label>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-40 h-8 text-xs"
                />
              </div>
              {isCustomActive && (
                <span className="text-xs text-slate-400 transition-opacity duration-300">
                  {formatDateRange(dateRange)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Issued"
          value={fmt(stats.totalIssued)}
          icon={Send}
          description="Sent to clients"
          count={stats.issuedCount}
          isLoading={isLoading}
        />
        <StatCard
          title="Total Paid"
          value={fmt(stats.totalPaid)}
          icon={DollarSign}
          description={periodLabel}
          count={stats.paidCount}
          isLoading={isLoading}
        />
        <StatCard
          title="Outstanding Balance"
          value={fmt(stats.outstandingBalance)}
          icon={AlertCircle}
          description="Awaiting payment"
          count={stats.outstandingCount}
          isLoading={isLoading}
        />
        <StatCard
          title="Draft Invoices"
          value={fmt(stats.draftTotal)}
          icon={FileText}
          description="Not yet issued"
          count={stats.draftCount}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
