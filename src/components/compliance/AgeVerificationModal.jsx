import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Shield } from 'lucide-react';

export default function AgeVerificationModal({ open, onOpenChange, onVerified }) {
  const [childAge, setChildAge] = useState('');
  const [parentalConsent, setParentalConsent] = useState(false);
  const [isUnder13, setIsUnder13] = useState(false);
  const [consentMethod, setConsentMethod] = useState('');

  const handleAgeCheck = () => {
    const age = parseInt(childAge);
    if (age < 13) {
      setIsUnder13(true);
    } else {
      // Child is 13 or older, proceed without additional consent
      onVerified({ requiresCOPPAConsent: false, childAge: age });
    }
  };

  const handleCOPPAConsent = () => {
    if (consentMethod && parentalConsent) {
      onVerified({ 
        requiresCOPPAConsent: true, 
        childAge: parseInt(childAge),
        consentMethod,
        consentTimestamp: new Date().toISOString()
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Child Privacy Protection
          </DialogTitle>
          <DialogDescription>
            To protect children's privacy, we need to verify your child's age and obtain proper consent if required.
          </DialogDescription>
        </DialogHeader>

        {!isUnder13 ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="child-age">What is your child's age?</Label>
              <Input
                id="child-age"
                type="number"
                min="0"
                max="18"
                value={childAge}
                onChange={(e) => setChildAge(e.target.value)}
                placeholder="Enter age"
              />
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                We collect minimal information about your child to provide personalized learning experiences. 
                All data is securely stored and never shared with third parties.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button onClick={handleAgeCheck} disabled={!childAge}>
                Continue
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>COPPA Compliance Required</strong><br />
                Since your child is under 13, federal law (COPPA) requires verifiable parental consent 
                before we can collect any personal information.
              </AlertDescription>
            </Alert>

            <div>
              <Label>Choose verification method:</Label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="email"
                    checked={consentMethod === 'email'}
                    onChange={(e) => setConsentMethod(e.target.value)}
                  />
                  <span>Email verification with knowledge-based questions</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="phone"
                    checked={consentMethod === 'phone'}
                    onChange={(e) => setConsentMethod(e.target.value)}
                  />
                  <span>Phone verification</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="credit_card"
                    checked={consentMethod === 'credit_card'}
                    onChange={(e) => setConsentMethod(e.target.value)}
                  />
                  <span>Credit card verification (no charge)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="parental-consent"
                checked={parentalConsent}
                onChange={(e) => setParentalConsent(e.target.checked)}
              />
              <Label htmlFor="parental-consent" className="text-sm">
                I am the parent/guardian of this child and consent to the collection and use of my child's 
                information as described in our Privacy Policy
              </Label>
            </div>

            <DialogFooter>
              <Button 
                onClick={handleCOPPAConsent} 
                disabled={!consentMethod || !parentalConsent}
              >
                Provide Consent & Continue
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
