import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Globe, Key, Users, AlertTriangle } from 'lucide-react';
import { EnterpriseConfig } from '@/api/entities';
import { useToast } from '@/components/ui/use-toast';

export default function SSOConfiguration({ organizationId, user }) {
  const [config, setConfig] = useState({
    sso_config: {
      enabled: false,
      provider: '',
      endpoint: '',
      client_id: '',
      scim_enabled: false
    },
    security_policies: {
      require_mfa: false,
      session_timeout_minutes: 480,
      password_policy: {
        min_length: 8,
        require_special_chars: true,
        require_numbers: true
      },
      ip_whitelist: []
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfiguration();
  }, [organizationId]);

  const loadConfiguration = async () => {
    try {
      const configs = await EnterpriseConfig.filter({ organization_id: organizationId });
      if (configs.length > 0) {
        setConfig(prev => ({ ...prev, ...configs[0] }));
      }
    } catch (error) {
      console.error('Failed to load SSO configuration:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load configuration. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setIsSaving(true);
    try {
      const existingConfigs = await EnterpriseConfig.filter({ organization_id: organizationId });
      
      if (existingConfigs.length > 0) {
        await EnterpriseConfig.update(existingConfigs[0].id, {
          ...config,
          organization_id: organizationId
        });
      } else {
        await EnterpriseConfig.create({
          ...config,
          organization_id: organizationId,
          organization_type: 'district'
        });
      }

      toast({
        title: "Success",
        description: "Configuration saved successfully."
      });
    } catch (error) {
      console.error('Failed to save configuration:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save configuration. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSSOConfig = (field, value) => {
    setConfig(prev => ({
      ...prev,
      sso_config: {
        ...prev.sso_config,
        [field]: value
      }
    }));
  };

  const updateSecurityPolicy = (field, value) => {
    setConfig(prev => ({
      ...prev,
      security_policies: {
        ...prev.security_policies,
        [field]: value
      }
    }));
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">SSO & Security Configuration</h2>
        <Button onClick={saveConfiguration} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      <Tabs defaultValue="sso" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sso">Single Sign-On</TabsTrigger>
          <TabsTrigger value="security">Security Policies</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="sso" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                SSO Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="sso-enabled"
                  checked={config.sso_config.enabled}
                  onCheckedChange={(checked) => updateSSOConfig('enabled', checked)}
                />
                <Label htmlFor="sso-enabled">Enable Single Sign-On</Label>
              </div>

              {config.sso_config.enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="sso-provider">SSO Provider</Label>
                    <Select
                      value={config.sso_config.provider}
                      onValueChange={(value) => updateSSOConfig('provider', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select SSO provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google">Google Workspace</SelectItem>
                        <SelectItem value="microsoft">Microsoft Azure AD</SelectItem>
                        <SelectItem value="okta">Okta</SelectItem>
                        <SelectItem value="classlink">ClassLink</SelectItem>
                        <SelectItem value="clever">Clever</SelectItem>
                        <SelectItem value="saml">Generic SAML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sso-endpoint">SSO Endpoint URL</Label>
                    <Input
                      id="sso-endpoint"
                      value={config.sso_config.endpoint}
                      onChange={(e) => updateSSOConfig('endpoint', e.target.value)}
                      placeholder="https://your-sso-provider.com/saml"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client-id">Client ID</Label>
                    <Input
                      id="client-id"
                      value={config.sso_config.client_id}
                      onChange={(e) => updateSSOConfig('client_id', e.target.value)}
                      placeholder="Your SSO client identifier"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="scim-enabled"
                      checked={config.sso_config.scim_enabled}
                      onCheckedChange={(checked) => updateSSOConfig('scim_enabled', checked)}
                    />
                    <Label htmlFor="scim-enabled">Enable SCIM Provisioning</Label>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Policies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="require-mfa"
                  checked={config.security_policies.require_mfa}
                  onCheckedChange={(checked) => updateSecurityPolicy('require_mfa', checked)}
                />
                <Label htmlFor="require-mfa">Require Multi-Factor Authentication</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  value={config.security_policies.session_timeout_minutes}
                  onChange={(e) => updateSecurityPolicy('session_timeout_minutes', parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Password Policy</Label>
                <div className="space-y-2 pl-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-length">Minimum Length</Label>
                    <Input
                      id="min-length"
                      type="number"
                      value={config.security_policies.password_policy?.min_length || 8}
                      onChange={(e) => updateSecurityPolicy('password_policy', {
                        ...config.security_policies.password_policy,
                        min_length: parseInt(e.target.value)
                      })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="require-special"
                      checked={config.security_policies.password_policy?.require_special_chars}
                      onCheckedChange={(checked) => updateSecurityPolicy('password_policy', {
                        ...config.security_policies.password_policy,
                        require_special_chars: checked
                      })}
                    />
                    <Label htmlFor="require-special">Require Special Characters</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="require-numbers"
                      checked={config.security_policies.password_policy?.require_numbers}
                      onCheckedChange={(checked) => updateSecurityPolicy('password_policy', {
                        ...config.security_policies.password_policy,
                        require_numbers: checked
                      })}
                    />
                    <Label htmlFor="require-numbers">Require Numbers</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Compliance Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  Compliance settings require careful configuration. Please consult with your legal and IT teams before making changes.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}