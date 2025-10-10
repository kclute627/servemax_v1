import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react';
import { dummyData } from '@/data/dummyData';
import { useDummyData } from '@/hooks/useDummyData';
import { useGlobalData } from '@/components/GlobalDataContext';

export default function DummyDataToggle() {
  const [isLoading, setIsLoading] = useState(false);
  const { isActive, activateDummyData, deactivateDummyData } = useDummyData();
  const { refreshData } = useGlobalData();

  const handleToggleDummyData = async () => {
    setIsLoading(true);

    try {
      if (isActive) {
        deactivateDummyData();
      } else {
        activateDummyData();
      }
      // Refresh the global data context to pick up the change
      await refreshData();
    } catch (error) {
      console.error('Error toggling dummy data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-dashed border-2 border-slate-300 bg-slate-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="w-5 h-5 text-slate-600" />
          Demo Data Visualization
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {isActive
              ? "Demo data is currently active. Your dashboard is showing realistic sample data to preview how it will look with actual business data."
              : "Toggle demo data to see how your dashboard will look with realistic business data including clients, jobs, invoices, and analytics."
            }
          </p>

          {isActive && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <strong>Demo Data Includes:</strong>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• {dummyData.clients.length} sample clients (law firms, banks, etc.)</li>
                  <li>• {dummyData.employees.length} process servers with performance metrics</li>
                  <li>• {dummyData.jobs.length}+ jobs with various statuses and realistic data</li>
                  <li>• {dummyData.invoices.length} invoices showing financial performance</li>
                  <li>• Complete business analytics and dashboard metrics</li>
                </ul>
              </div>
            </div>
          )}

          <Button
            onClick={handleToggleDummyData}
            disabled={isLoading}
            variant={isActive ? "outline" : "default"}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isActive ? 'Clearing Demo Data...' : 'Loading Demo Data...'}
              </>
            ) : (
              <>
                {isActive ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide Demo Data
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Show Demo Data
                  </>
                )}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}