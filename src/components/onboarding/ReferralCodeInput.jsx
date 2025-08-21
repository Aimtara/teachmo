import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { applyReferralCode } from '@/api/functions';

export default function ReferralCodeInput({ onCodeApplied, showAsCard = true }) {
  const [code, setCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [appliedCode, setAppliedCode] = useState(null);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleApplyCode = async () => {
    if (!code.trim()) {
      setError('Please enter a referral code');
      return;
    }

    setIsApplying(true);
    setError('');

    try {
      const response = await applyReferralCode({ code: code.trim().toUpperCase() });
      
      if (response.data.success) {
        setAppliedCode({
          code: code.trim().toUpperCase(),
          ...response.data.codeData
        });
        setCode('');
        
        toast({
          title: "Code Applied Successfully!",
          description: `You've received ${response.data.codeData.benefit_description}`,
          duration: 5000
        });

        if (onCodeApplied) {
          onCodeApplied(response.data.codeData);
        }
      } else {
        setError(response.data.message || 'Invalid or expired referral code');
      }
    } catch (error) {
      console.error('Error applying referral code:', error);
      setError('Failed to apply referral code. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleApplyCode();
    }
  };

  const content = (
    <div className="space-y-4">
      {appliedCode ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <h4 className="font-semibold text-green-800">Code Applied!</h4>
              <p className="text-sm text-green-700">
                Code: <span className="font-mono font-bold">{appliedCode.code}</span>
              </p>
              <p className="text-sm text-green-700">{appliedCode.benefit_description}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">
              Have a referral or sponsorship code?
            </span>
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter code (e.g., SCHOOL2024)"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError('');
                }}
                onKeyPress={handleKeyPress}
                className="uppercase"
                disabled={isApplying}
              />
              {error && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
            <Button 
              onClick={handleApplyCode}
              disabled={!code.trim() || isApplying}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                'Apply'
              )}
            </Button>
          </div>
          
          <div className="text-xs text-gray-500">
            Codes provide benefits like premium access, discounts, or special features
          </div>
        </div>
      )}
    </div>
  );

  if (!showAsCard) {
    return content;
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Gift className="w-5 h-5 text-blue-600" />
          Referral Code
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {content}
      </CardContent>
    </Card>
  );
}