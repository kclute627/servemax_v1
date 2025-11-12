import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { DATE_RANGE_OPTIONS, getDateRangeLabel } from '@/utils/dateRangeHelpers';

export default function DateRangeFilter({ selectedRange, onRangeChange }) {
  const ranges = [
    DATE_RANGE_OPTIONS.TODAY,
    DATE_RANGE_OPTIONS.THIS_WEEK,
    DATE_RANGE_OPTIONS.THIS_MONTH,
    DATE_RANGE_OPTIONS.LAST_MONTH
  ];

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-slate-500" />
      <div className="inline-flex rounded-md shadow-sm" role="group">
        {ranges.map((range, index) => (
          <Button
            key={range}
            type="button"
            variant={selectedRange === range ? "default" : "outline"}
            size="sm"
            onClick={() => onRangeChange(range)}
            className={`
              ${index === 0 ? 'rounded-r-none' : ''}
              ${index === ranges.length - 1 ? 'rounded-l-none' : ''}
              ${index !== 0 && index !== ranges.length - 1 ? 'rounded-none border-l-0' : ''}
              ${index === 0 && index !== ranges.length - 1 ? 'border-r-0' : ''}
              transition-all
              ${selectedRange === range
                ? 'bg-blue-600 text-white hover:bg-blue-700 z-10'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
              }
            `}
          >
            {getDateRangeLabel(range)}
          </Button>
        ))}
      </div>
    </div>
  );
}
