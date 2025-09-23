
// FIREBASE TRANSITION: This is a presentational component. It only receives data via props (`attempts`) and contains no data fetching or mutation logic. No changes should be needed for migration.

import React from 'react';
import { Sun, SunMoon, Moon, CalendarDays, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function AttemptTimeIndicator({ attempts = [] }) {

    const windows = {
        morning: false,
        afternoon: false,
        evening: false,
        weekend: false,
    };

    if (Array.isArray(attempts)) {
        attempts.forEach(attempt => {
            if (!attempt.attempt_date) return;
            
            const date = new Date(attempt.attempt_date);
            if (isNaN(date.getTime())) return;

            const day = date.getDay(); // 0 = Sunday, 6 = Saturday
            const hour = date.getHours();
            const isWeekday = day > 0 && day < 6;

            if (isWeekday) {
                if (hour < 8) windows.morning = true;
                else if (hour >= 8 && hour < 19) windows.afternoon = true;
                else if (hour >= 19) windows.evening = true;
            } else {
                windows.weekend = true;
            }
        });
    }

    const indicators = [
        { label: 'Morning', covered: windows.morning, icon: Sun, tooltip: 'Attempt made before 8 AM on a weekday' },
        { label: 'Afternoon', covered: windows.afternoon, icon: SunMoon, tooltip: 'Attempt made between 8 AM - 7 PM on a weekday' },
        { label: 'Evening', covered: windows.evening, icon: Moon, tooltip: 'Attempt made after 7 PM on a weekday' },
        { label: 'Weekend', covered: windows.weekend, icon: CalendarDays, tooltip: 'Attempt made on a Saturday or Sunday' }
    ];

    const IndicatorCircle = ({ indicator }) => {
        const Icon = indicator.icon;
        return (
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex flex-col items-center gap-2">
                             <div className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                                 indicator.covered 
                                     ? 'bg-green-100 border-2 border-green-200' 
                                     : 'bg-slate-100 border-2 border-slate-200'
                             }`}>
                                 <Icon className={`w-6 h-6 ${indicator.covered ? 'text-green-600' : 'text-slate-400'}`} />
                                 {indicator.covered && (
                                     <CheckCircle2 className="absolute -top-1 -right-1 w-5 h-5 text-white bg-green-500 rounded-full p-0.5" />
                                 )}
                             </div>
                             <span className={`text-xs font-medium ${indicator.covered ? 'text-slate-800' : 'text-slate-500'}`}>
                                 {indicator.label}
                             </span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{indicator.tooltip}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    };

    return (
        <div className="grid grid-cols-4 gap-4">
            {indicators.map((indicator, index) => (
                <IndicatorCircle key={index} indicator={indicator} />
            ))}
        </div>
    );
}
