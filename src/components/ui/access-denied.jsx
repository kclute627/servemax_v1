import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AccessDenied({
  title = "Access Denied",
  message = "You don't have permission to access this page.",
  showBackButton = true,
  showHomeButton = true
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-xl text-slate-900">{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              If you believe this is an error, please contact your administrator or company owner.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            {showBackButton && (
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            )}
            {showHomeButton && (
              <Button
                onClick={() => navigate(createPageUrl('Dashboard'))}
                className="flex-1"
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}