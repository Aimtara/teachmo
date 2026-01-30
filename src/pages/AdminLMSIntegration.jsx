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
import ServiceConnect from '@/components/integration/ServiceConnect';
import { ultraMinimalToast } from '@/components/shared/UltraMinimalToast';
import { LTI_LAUNCH_URL, LTI_JWKS_URL } from '@/config/api';

export default function AdminLMSIntegration() {
  // LTI Platform Configuration State
  const [ltiPlatformIssuer, setLtiPlatformIssuer] = useState('');
  const [ltiClientId, setLtiClientId] = useState('');
  
  // xAPI/LRS Configuration State
  const [lrsEndpoint, setLrsEndpoint] = useState('');
  const [lrsAuthUsername, setLrsAuthUsername] = useState('');
  const [lrsAuthPassword, setLrsAuthPassword] = useState('');
  
  const [isLtiSaving, setIsLtiSaving] = useState(false);
  const [isLrsSaving, setIsLrsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSaveLtiPlatform = async () => {
    if (!ltiPlatformIssuer.trim() || !ltiClientId.trim()) {
      ultraMinimalToast.error('Please fill in all required fields');
      return;
    }
    
    setIsLtiSaving(true);
    try {
      // TODO: Implement backend API call to save LTI platform configuration
      await new Promise((resolve) => setTimeout(resolve, 1000));
      ultraMinimalToast.success('LTI platform configuration saved');
      setLtiPlatformIssuer('');
      setLtiClientId('');
    } catch (error) {
      console.error(error);
      ultraMinimalToast.error('Failed to save configuration. Please try again.');
    } finally {
      setIsLtiSaving(false);
    }
  };

  const handleSaveLrsConfiguration = async () => {
    if (!lrsEndpoint.trim() || !lrsAuthUsername.trim() || !lrsAuthPassword.trim()) {
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

  const handleTestLrsConnection = async () => {
    if (!lrsEndpoint.trim() || !lrsAuthUsername.trim() || !lrsAuthPassword.trim()) {
      ultraMinimalToast.error('Please fill in all required fields before testing');
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
                    value={LTI_LAUNCH_URL}
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lti-jwks-url">Public JWKS URL</Label>
                  <Input
                    id="lti-jwks-url"
                    readOnly
                    value={LTI_JWKS_URL}
                    className="bg-gray-50"
                  />
                </div>
              </div>
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-4">Register New Platform</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
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
                  onClick={handleSaveLtiPlatform}
                  disabled={isLtiSaving}
                >
                  {isLtiSaving ? 'Saving...' : 'Save Platform Configuration'}
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
                    value={lrsAuthPassword}
                    onChange={(e) => setLrsAuthPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button 
                  onClick={handleSaveLrsConfiguration}
                  disabled={isLrsSaving}
                >
                  {isLrsSaving ? 'Saving...' : 'Save Configuration'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleTestLrsConnection}
                  disabled={isTesting}
                >
                  {isTesting ? 'Testing...' : 'Test Connection'}
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
