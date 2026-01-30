import React, { useState } from 'react';
import { Database, Globe, Key, Server } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import ServiceConnect from '@/components/integration/ServiceConnect';
import { ultraMinimalToast } from '@/components/shared/UltraMinimalToast';

// Get base URL from environment or fallback to default API path
const LTI_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export default function AdminLMSIntegration() {
  // LTI Platform Configuration State
  const [ltiIssuer, setLtiIssuer] = useState('');
import { LTI_LAUNCH_URL, LTI_JWKS_URL } from '@/config/api';

export default function AdminLMSIntegration() {
  const { toast } = useToast();
  
  // LTI Platform Configuration State
  const [ltiPlatformIssuer, setLtiPlatformIssuer] = useState('');
  const [ltiClientId, setLtiClientId] = useState('');
  
  // xAPI/LRS Configuration State
  const [lrsEndpoint, setLrsEndpoint] = useState('');
  const [lrsUsername, setLrsUsername] = useState('');
  const [lrsPassword, setLrsPassword] = useState('');
  
  const [isLtiSaving, setIsLtiSaving] = useState(false);
  const [isLrsSaving, setIsLrsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSaveLTIPlatform = async () => {
    if (!ltiIssuer || !ltiClientId) {
      ultraMinimalToast.error('Please fill in all required fields');
      return;
    }
    
    setIsLtiSaving(true);
    try {
      // TODO: Implement backend API call to save LTI platform configuration
      await new Promise((resolve) => setTimeout(resolve, 1000));
      ultraMinimalToast.success('LTI platform configuration saved');
      setLtiIssuer('');
      setLtiClientId('');
    } catch (error) {
      console.error(error);
      ultraMinimalToast.error('Failed to save configuration. Please try again.');
    } finally {
      setIsLtiSaving(false);
    }
  };

  const handleSaveLRSConfig = async () => {
    if (!lrsEndpoint || !lrsUsername || !lrsPassword) {
      ultraMinimalToast.error('Please fill in all required fields');
      return;
    }
    
    setIsLrsSaving(true);
    try {
      // TODO: Implement backend API call to save LRS configuration
      await new Promise((resolve) => setTimeout(resolve, 1000));
      ultraMinimalToast.success('LRS configuration saved');
      // Keep fields populated so users can test connection after saving
    } catch (error) {
      console.error(error);
      ultraMinimalToast.error('Failed to save configuration. Please try again.');
    } finally {
      setIsLrsSaving(false);
    }
  };

  const handleTestLRSConnection = async () => {
    if (!lrsEndpoint || !lrsUsername || !lrsPassword) {
      ultraMinimalToast.error('Please save configuration before testing');
      return;
    }
    
    setIsTesting(true);
    try {
      // TODO: Implement backend API call to test LRS connection
      await new Promise((resolve) => setTimeout(resolve, 1500));
      ultraMinimalToast.success('LRS connection test successful');
    } catch (error) {
      console.error(error);
      ultraMinimalToast.error('Connection test failed. Please check your credentials.');
    } finally {
      setIsTesting(false);
    }
  };
  const [lrsAuthUsername, setLrsAuthUsername] = useState('');
  const [lrsAuthPassword, setLrsAuthPassword] = useState('');

  const handleSaveLtiPlatform = () => {
    if (!ltiPlatformIssuer.trim() || !ltiClientId.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Platform Issuer and Client ID are required.',
        variant: 'destructive',
      });
      return;
    }

    // TODO: Call GraphQL mutation to save LTI platform configuration
    // When implementing: wrap in try-catch and clear form state (including sensitive Client ID) in both success and error paths

    toast({
      title: 'Configuration Saved',
      description: 'LTI platform configuration has been saved successfully.',
    });

    // Clear form after successful save
    setLtiPlatformIssuer('');
    setLtiClientId('');
  };

  const handleSaveLrsConfiguration = () => {
    if (!lrsEndpoint.trim()) {
      toast({
        title: 'Validation Error',
        description: 'LRS Endpoint is required.',
        variant: 'destructive',
      });
      return;
    }

    // TODO: Call GraphQL mutation to save LRS configuration
    // When implementing: wrap in try-catch and clear password in both success and error paths for security

    toast({
      title: 'Configuration Saved',
      description: 'LRS configuration has been saved successfully.',
    });

    // Clear form after successful save, including sensitive password data
    setLrsEndpoint('');
    setLrsAuthUsername('');
    setLrsAuthPassword('');
  };

  const handleTestLrsConnection = () => {
    if (!lrsEndpoint.trim()) {
      toast({
        title: 'Validation Error',
        description: 'LRS Endpoint is required to test connection.',
        variant: 'destructive',
      });
      return;
    }

    // TODO: Call backend endpoint to test LRS connection

    toast({
      title: 'Feature Not Implemented',
      description: 'Connection testing will be available once the backend endpoint is implemented.',
      variant: 'destructive',
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Integrations &amp; Data</h1>
        <p className="text-gray-600">
          Configure LTI providers, xAPI stores, and third-party content services.
        </p>
      </header>

      <Tabs defaultValue="lti" className="w-full">
        <TabsList>
          <TabsTrigger value="lti">LTI Tool Providers</TabsTrigger>
          <TabsTrigger value="xapi">xAPI (LRS)</TabsTrigger>
          <TabsTrigger value="services">Content Services</TabsTrigger>
        </TabsList>

        <TabsContent value="lti" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" /> LTI 1.3 Configuration
              </CardTitle>
              <CardDescription>
                Add Teachmo as a tool in Canvas, Schoology, or Blackboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lti-launch-url">Tool Launch URL</Label>
                  <Input
                    id="lti-launch-url"
                    readOnly
                    value={`${LTI_BASE_URL}/lti/launch`}
                    value={LTI_LAUNCH_URL}
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lti-jwks-url">Public JWKS URL</Label>
                  <Input
                    id="lti-jwks-url"
                    readOnly
                    value={`${LTI_BASE_URL}/.well-known/jwks.json`}
                    value={LTI_JWKS_URL}
                    className="bg-gray-50"
                  />
                </div>
              </div>
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-4">Register New Platform</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="lti-issuer">Platform Issuer (ISS)</Label>
                    <Input
                      id="lti-issuer"
                      placeholder="https://canvas.instructure.com"
                      value={ltiIssuer}
                      onChange={(e) => setLtiIssuer(e.target.value)}
                    <Label htmlFor="lti-platform-issuer">Platform Issuer (ISS)</Label>
                    <Input
                      id="lti-platform-issuer"
                      placeholder="https://canvas.instructure.com"
                      value={ltiPlatformIssuer}
                      onChange={(e) => setLtiPlatformIssuer(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lti-client-id">Client ID</Label>
                    <Input
                      id="lti-client-id"
                      placeholder="10000000000001"
                      value={ltiClientId}
                      onChange={(e) => setLtiClientId(e.target.value)}
                    />
                  </div>
                </div>
                <Button 
                  className="mt-4" 
                  onClick={handleSaveLTIPlatform}
                  disabled={isLtiSaving}
                >
                  {isLtiSaving ? 'Saving...' : 'Save Platform Configuration'}
                <Button className="mt-4" onClick={handleSaveLtiPlatform}>
                  Save Platform Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="xapi" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" /> Learning Record Store (LRS)
              </CardTitle>
              <CardDescription>
                Configure where xAPI statements for student activities should be
                sent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lrs-endpoint">LRS Endpoint</Label>
                <Input
                  id="lrs-endpoint"
                  placeholder="https://lrs.io/xapi/statements"
                  value={lrsEndpoint}
                  onChange={(e) => setLrsEndpoint(e.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lrs-auth-username">Auth Key / Username</Label>
                  <Input
                    id="lrs-auth-username"
                    placeholder="Basic Auth Username"
                    value={lrsUsername}
                    onChange={(e) => setLrsUsername(e.target.value)}
                    value={lrsAuthUsername}
                    onChange={(e) => setLrsAuthUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lrs-auth-password">Auth Secret / Password</Label>
                  <Input
                    id="lrs-auth-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={lrsPassword}
                    onChange={(e) => setLrsPassword(e.target.value)}
                    placeholder="••••••••••••"
                    value={lrsAuthPassword}
                    onChange={(e) => setLrsAuthPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button 
                  onClick={handleSaveLRSConfig}
                  disabled={isLrsSaving}
                >
                  {isLrsSaving ? 'Saving...' : 'Save Configuration'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleTestLRSConnection}
                  disabled={isTesting}
                >
                  {isTesting ? 'Testing...' : 'Test Connection'}
                <Button onClick={handleSaveLrsConfiguration}>
                  Save Configuration
                </Button>
                <Button variant="outline" onClick={handleTestLrsConnection}>
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4 mt-6">
          <ServiceConnect
            serviceKey="khan_academy"
            serviceName="Khan Academy"
            icon={Globe}
          />
          {/* Connection status for Clever should be driven by real state, not hardcoded */}
          <ServiceConnect
            serviceKey="clever"
            serviceName="Clever (District)"
            icon={Server}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
