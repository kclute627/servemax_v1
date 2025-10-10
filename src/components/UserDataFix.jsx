import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FirebaseAuth } from '@/firebase/auth';
import { useAuth } from '@/components/auth/AuthProvider';
import { USER_TYPES, EMPLOYEE_ROLES } from '@/firebase/schemas';

export default function UserDataFix() {
  const { user, refresh } = useAuth();
  const [isFixing, setIsFixing] = useState(false);
  const [result, setResult] = useState('');

  const fixUserData = async () => {
    setIsFixing(true);
    setResult('');

    try {
      // Check current user data
      console.log('Current user data:', user);

      // Update the user document with the correct fields
      const updateData = {
        user_type: USER_TYPES.COMPANY_OWNER,
        employee_role: EMPLOYEE_ROLES.ADMIN
      };

      await FirebaseAuth.updateMyUserData(updateData);

      // Refresh the auth state
      await FirebaseAuth.refreshCurrentUser();
      await refresh();

      setResult('✅ User data fixed! The page should refresh automatically.');

      // Force a page refresh after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Error fixing user data:', error);
      setResult(`❌ Error: ${error.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>🔧 User Data Fix</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p><strong>Current user_type:</strong> {user?.user_type || 'undefined'}</p>
          <p><strong>Current employee_role:</strong> {user?.employee_role || 'undefined'}</p>
          <p><strong>Should be:</strong> company_owner with admin role</p>
        </div>

        {result && (
          <Alert>
            <AlertDescription>{result}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={fixUserData}
          disabled={isFixing}
          className="w-full"
        >
          {isFixing ? 'Fixing...' : 'Fix User Data'}
        </Button>
      </CardContent>
    </Card>
  );
}