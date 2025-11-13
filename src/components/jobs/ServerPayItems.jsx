import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export default function ServerPayItems({ items, onItemsChange, defaultItems = [] }) {
  const [focusedDescIndex, setFocusedDescIndex] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    const item = newItems[index];
    
    // Convert to number for quantity and rate
    if (field === 'quantity' || field === 'rate') {
      value = parseFloat(value) || 0;
    }
    item[field] = value;

    // Recalculate total for the item
    const quantity = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    item.total = quantity * rate;
    
    onItemsChange(newItems);
  };
  
  const handleDefaultSelect = (index, defaultItem) => {
    const newItems = [...items];
    const currentItem = newItems[index];
    
    currentItem.description = defaultItem.description;
    currentItem.rate = defaultItem.rate;
    
    const quantity = parseFloat(currentItem.quantity) || 1;
    currentItem.total = quantity * currentItem.rate;
    
    onItemsChange(newItems);
  };

  const addItem = () => {
    const newItems = [...items, { description: '', quantity: 1, rate: 0, total: 0 }];
    onItemsChange(newItems);
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
  };

  const calculateTotalPay = () => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Server Pay Breakdown</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span className="text-sm">Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span className="text-sm">Expand to Edit</span>
              </>
            )}
          </Button>
        </div>

        {/* Always show total */}
        {!isExpanded && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-900">Total Server Pay:</span>
              <span className="text-2xl font-bold text-slate-900">${calculateTotalPay().toFixed(2)}</span>
            </div>
            {items.length > 0 && (
              <div className="mt-2 text-xs text-slate-500">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </div>
            )}
          </div>
        )}

        {isExpanded && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2 space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 sm:col-span-5 relative">
                {index === 0 && <Label className="text-xs">Description</Label>}
                <Input
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  onFocus={() => setFocusedDescIndex(index)}
                  onBlur={() => setTimeout(() => setFocusedDescIndex(null), 200)}
                  placeholder="e.g., Routine Service, Printing"
                  autoComplete="off"
                />
                {focusedDescIndex === index && defaultItems.length > 0 && (
                  <Card className="absolute z-10 top-full w-full shadow-lg mt-1">
                    <CardContent className="p-1 max-h-40 overflow-y-auto">
                      {defaultItems.map(defaultItem => (
                        <div 
                          key={defaultItem.description}
                          className="p-2 hover:bg-slate-100 cursor-pointer rounded-md text-sm"
                          onMouseDown={() => handleDefaultSelect(index, defaultItem)}
                        >
                          <span className="font-medium">{defaultItem.description}</span>
                          <span className="text-slate-500 ml-2">${defaultItem.rate.toFixed(2)}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
              <div className="col-span-4 sm:col-span-2">
                {index === 0 && <Label className="text-xs">Qty</Label>}
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  placeholder="Qty"
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                {index === 0 && <Label className="text-xs">Rate ($)</Label>}
                <Input
                  type="number"
                  value={item.rate}
                  onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                  placeholder="Rate"
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                {index === 0 && <Label className="text-xs">Total ($)</Label>}
                <p className="h-10 flex items-center px-3 font-medium text-slate-900">
                  {(item.total || 0).toFixed(2)}
                </p>
              </div>
              <div className="col-span-12 sm:col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  className="text-slate-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="gap-2 mt-4"
          >
            <Plus className="w-4 h-4" />
            Add Pay Item
          </Button>
          <div className="pt-4 border-t border-slate-200 mt-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-900">Total Server Pay:</span>
              <span className="text-2xl font-bold text-slate-900">${calculateTotalPay().toFixed(2)}</span>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}