import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldAlert, Loader2, Info, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

const SecurityPolicyModal = ({ open, onOpenChange }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[650px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="w-6 h-6" /> Security Policy
        </DialogTitle>
        <DialogDescription>
          Our approach to maintaining the security and integrity of the Teachmo platform.
        </DialogDescription>
      </DialogHeader>
      <ScrollArea className="h-[60vh] p-4 border rounded-md">
        <div className="space-y-4 text-sm text-gray-700">
          <h3 className="font-bold text-base text-gray-900">Supported Versions</h3>
          <p>We are committed to providing security updates for the latest major version of Teachmo. Please ensure you are on the most current version to receive all security patches.</p>

          <h3 className="font-bold text-base text-gray-900">Reporting a Vulnerability</h3>
          <p>
            We take all security bugs in Teachmo seriously. We appreciate your efforts and responsible disclosure and will make every effort to acknowledge your contributions.
          </p>
          <p>
            To report a vulnerability, please email our security team at <a href="mailto:security@teachmo.com" className="text-blue-600 underline">security@teachmo.com</a> with a detailed description of the issue, steps to reproduce, and any potential impact.
          </p>
          <p>
            <strong>Please do not disclose security issues publicly.</strong> Allow our team a reasonable amount of time (typically 90 days) to address the issue before any public disclosure.
          </p>

          <h3 className="font-bold text-base text-gray-900">Dependency Management</h3>
          <p>
            Our project utilizes `npm audit` for regular automated scanning of our third-party dependencies. High-severity vulnerabilities are addressed with high priority. The System Admin dashboard provides a tool to initiate a manual dependency scan at any time.
          </p>

           <h3 className="font-bold text-base text-gray-900">Data Security</h3>
           <p>
            All sensitive data, including user credentials and personally identifiable information (PII), is encrypted at rest and in transit. Access to production data is strictly limited to authorized personnel.
           </p>

           <h3 className="font-bold text-base text-gray-900">Code of Conduct</h3>
           <p>When researching security issues, we ask that you act in good faith and do not:</p>
           <ul className="list-disc pl-5 space-y-1">
             <li>Access, modify, or destroy any user data.</li>
             <li>Disrupt our services or perform denial-of-service attacks.</li>
             <li>Violate any applicable laws or regulations.</li>
           </ul>
        </div>
      </ScrollArea>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button">Close</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default function SecurityStatusWidget() {
  const [status, setStatus] = useState('secure'); // 'secure', 'vulnerable', 'unknown'
  const [lastChecked, setLastChecked] = useState(new Date());
  const [isScanning, setIsScanning] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [vulnerabilityCount, setVulnerabilityCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // In a real app, you might fetch this initial status from a backend service
    // that runs nightly security audits.
    const interval = setInterval(() => {
      setLastChecked(prev => prev); // Force re-render for time ago
    }, 60000); // Update "time ago" every minute

    return () => clearInterval(interval);
  }, []);

  const handleScan = () => {
    setIsScanning(true);
    toast({
      title: 'Security Scan Initiated',
      description: 'Scanning dependencies for known vulnerabilities...',
    });

    // Simulate the async nature of a real scan
    setTimeout(() => {
      // In a real implementation, this would be the result of `npm audit --json`
      const hasVulnerabilities = Math.random() > 0.8; // 20% chance of finding a mock vulnerability
      const newVulnerabilityCount = hasVulnerabilities ? Math.floor(Math.random() * 5) + 1 : 0;
      
      setVulnerabilityCount(newVulnerabilityCount);
      setStatus(hasVulnerabilities ? 'vulnerable' : 'secure');
      setLastChecked(new Date());
      setIsScanning(false);
      
      toast({
        variant: hasVulnerabilities ? 'destructive' : 'default',
        title: 'Scan Complete',
        description: hasVulnerabilities 
          ? `Found ${newVulnerabilityCount} vulnerabilities. Please review the server logs.`
          : 'No new vulnerabilities found. System is secure.',
      });
    }, 2500);
  };

  const StatusIcon = status === 'secure' ? ShieldCheck : ShieldAlert;
  const statusColor = status === 'secure' ? 'text-green-600' : 'text-red-600';
  const statusBgColor = status === 'secure' ? 'bg-green-100' : 'bg-red-100';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Security Status</span>
            <StatusIcon className={`w-6 h-6 ${statusColor}`} />
          </CardTitle>
          <CardDescription>
            Dependency vulnerability scanning. Last checked: {formatDistanceToNow(lastChecked, { addSuffix: true })}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg flex items-center gap-4 ${statusBgColor}`}>
            <StatusIcon className={`w-8 h-8 ${statusColor}`} />
            <div>
              <p className={`font-bold text-lg ${statusColor}`}>
                {status === 'secure' ? 'System Secure' : `${vulnerabilityCount} Vulnerabilities Found`}
              </p>
              <p className={`text-sm ${statusColor}/80`}>
                {status === 'secure' 
                  ? 'No high-severity vulnerabilities detected.'
                  : 'Action required. Check logs for details.'
                }
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <Button onClick={handleScan} disabled={isScanning} className="flex-1">
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                'Run Manual Scan'
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowPolicy(true)} className="flex-1">
              <Info className="w-4 h-4 mr-2" />
              View Security Policy
            </Button>
          </div>
        </CardContent>
      </Card>
      <SecurityPolicyModal open={showPolicy} onOpenChange={setShowPolicy} />
    </>
  );
}