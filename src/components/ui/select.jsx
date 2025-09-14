
"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

// This is a custom Select component that uses native HTML <select> to avoid dependency issues.
export const Select = ({ className, children, ...props }) => (
  <div className="relative">
    <select
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50 pointer-events-none" />
  </div>
);

export const SelectItem = ({ className, ...props }) => (
  <option className={cn("", className)} {...props} />
);

export const SelectSeparator = ({ className, ...props }) => (
  <option disabled className={cn("bg-slate-100 font-semibold text-center", className)} {...props}>
    ──────────
  </option>
);

// Dummy exports to prevent other components from crashing if they still import these. They do nothing.
export const SelectTrigger = () => null;
export const SelectValue = () => null;
export const SelectContent = ({ children }) => null;
export const SelectGroup = ({ children }) => null;
export const SelectLabel = () => null;
