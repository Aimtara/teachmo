import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { apiClient } from '@/services/core/client';
import { CheckCircle2, ArrowRight, Building2, User } from 'lucide-react';

const STEPS = [
  { id: 'organization', title: 'Organization Profile' },
  { id: 'contact', title: 'Point of Contact' },
  { id: 'offerings', title: 'Educational Offerings' }
];

export default function PartnerRegistration() {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    orgName: '',
    website: '',
    type: '',
    contactName: '',
    contactEmail: '',
    description: '',
    offeringType: 'curriculum'
  });

  const handleNext = () => setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 0));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/api/public/partners/register', formData);
      setStep(3);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: 'Please check your details and try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl mb-2">Application Received!</CardTitle>
          <CardDescription className="mb-6">
            Thanks for applying to join the Teachmo Partner Ecosystem. Our team will review your
            application and contact you at {formData.contactEmail} within 2-3 business days.
          </CardDescription>
          <Button onClick={() => {
            window.location.href = '/';
          }}>
            Return Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">Partner Registration</h1>
          <p className="mt-2 text-slate-600">Join our network of educational providers.</p>
        </div>

        <div className="flex justify-between relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -z-10" />
          {STEPS.map((s, idx) => (
            <div
              key={s.id}
              className={`flex flex-col items-center bg-slate-50 px-2 ${step >= idx ? 'text-indigo-600' : 'text-slate-400'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2 ${step >= idx ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300 bg-white'}`}
              >
                {idx + 1}
              </div>
              <span className="text-xs font-medium">{s.title}</span>
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step].title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-9"
                      value={formData.orgName}
                      onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                      placeholder="Acme Education Inc."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Organization Type</Label>
                  <Select onValueChange={(val) => setFormData({ ...formData, type: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non_profit">Non-Profit</SelectItem>
                      <SelectItem value="for_profit">For-Profit / EdTech</SelectItem>
                      <SelectItem value="community">Community Organization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-9"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Business Email</Label>
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Offering</Label>
                  <Select onValueChange={(val) => setFormData({ ...formData, offeringType: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select offering type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="curriculum">Curriculum & Resources</SelectItem>
                      <SelectItem value="enrichment">After-school Enrichment</SelectItem>
                      <SelectItem value="tutoring">Tutoring Services</SelectItem>
                      <SelectItem value="events">Events & Workshops</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Tell us about your educational impact..."
                    rows={4}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack} disabled={step === 0}>
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={handleNext}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
