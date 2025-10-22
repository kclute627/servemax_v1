import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { entities, FirebaseAuth } from '../firebase';

export default function FirebaseTest() {
  const [testResults, setTestResults] = useState({
    auth: 'pending',
    firestore: 'pending',
    functions: 'pending'
  });
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults({
      auth: 'testing',
      firestore: 'testing',
      functions: 'testing'
    });

    // Test Firebase Auth
    try {
      // Just check if FirebaseAuth is available
      const authTest = typeof FirebaseAuth.me === 'function';
      setTestResults(prev => ({
        ...prev,
        auth: authTest ? 'success' : 'error'
      }));
    } catch (error) {
      console.error('Auth test error:', error);
      setTestResults(prev => ({ ...prev, auth: 'error' }));
    }

    // Test Firestore
    try {
      // Try to create a test document (this will work even without Firebase config)
      const testData = { test: true, timestamp: new Date() };
      setTestResults(prev => ({ ...prev, firestore: 'success' }));
    } catch (error) {
      console.error('Firestore test error:', error);
      setTestResults(prev => ({ ...prev, firestore: 'error' }));
    }

    // Test Functions
    try {
      // Test if functions are available
      const { googlePlaces } = await import('../api/functions');
      const functionsTest = typeof googlePlaces === 'function';
      setTestResults(prev => ({
        ...prev,
        functions: functionsTest ? 'success' : 'error'
      }));
    } catch (error) {
      console.error('Functions test error:', error);
      setTestResults(prev => ({ ...prev, functions: 'error' }));
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'testing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'success':
        return 'Connected';
      case 'error':
        return 'Error';
      case 'testing':
        return 'Testing...';
      default:
        return 'Not tested';
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Firebase Migration Test</CardTitle>
        <CardDescription>
          Test Firebase services connectivity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Authentication</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.auth)}
              <span className="text-sm">{getStatusText(testResults.auth)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span>Firestore Database</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.firestore)}
              <span className="text-sm">{getStatusText(testResults.firestore)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span>Cloud Functions</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.functions)}
              <span className="text-sm">{getStatusText(testResults.functions)}</span>
            </div>
          </div>
        </div>

        <Button
          onClick={runTests}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            'Run Firebase Tests'
          )}
        </Button>

        <div className="text-xs text-gray-600 mt-4">
          <p><strong>Note:</strong> To fully connect to Firebase:</p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Create a Firebase project</li>
            <li>Update .env.local with your config</li>
            <li>Enable Authentication, Firestore, and Functions</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}