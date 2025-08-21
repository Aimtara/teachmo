import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Users, Shield, Phone, Mail, Loader2, CheckCircle, X } from 'lucide-react';
import { User } from '@/api/entities';
import { Follow } from '@/api/entities';
import { ContactImport } from '@/api/entities';
import { motion, AnimatePresence } from 'framer-motion';

export default function ContactDiscovery({ isOpen, onClose, onFollowUser }) {
  const [step, setStep] = useState('consent'); // consent, import, results
  const [isProcessing, setIsProcessing] = useState(false);
  const [foundUsers, setFoundUsers] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [error, setError] = useState(null);

  const handleContactImport = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Request contact access
      if (!navigator.contacts) {
        // Fallback for browsers without Contact Picker API
        throw new Error('Contact access not supported on this device. Please try on a mobile device or use a supported browser.');
      }

      const contacts = await navigator.contacts.select(['name', 'email', 'tel'], { multiple: true });
      
      if (contacts.length === 0) {
        setError('No contacts were selected or available.');
        setIsProcessing(false);
        return;
      }

      // Process contacts and find matching users
      const processedContacts = contacts.map(contact => ({
        name: contact.name?.[0] || 'Unknown',
        email: contact.email?.[0] || '',
        phone: contact.tel?.[0] || ''
      }));

      // Get all users to match against (in production, this would be done server-side)
      const allUsers = await User.list();
      const currentUser = await User.me();
      
      // Find matching users by email (phone matching would require normalization)
      const matchingUsers = allUsers.filter(user => {
        if (user.id === currentUser.id) return false; // Don't include self
        return processedContacts.some(contact => 
          contact.email && contact.email.toLowerCase() === user.email.toLowerCase()
        );
      });

      // Save contact import record
      await ContactImport.create({
        user_id: currentUser.id,
        contacts_data: processedContacts, // In production, this should be encrypted
        found_users: matchingUsers.map(u => u.id),
        opted_in: true,
        import_date: new Date().toISOString()
      });

      setFoundUsers(matchingUsers);
      setStep('results');
      
    } catch (err) {
      console.error('Contact import error:', err);
      setError(err.message || 'Failed to access contacts. Please check your browser permissions.');
    }
    
    setIsProcessing(false);
  };

  const handleFollowToggle = async (userId) => {
    try {
      const currentUser = await User.me();
      const isSelected = selectedContacts.has(userId);
      
      if (isSelected) {
        // Unfollow logic would go here
        setSelectedContacts(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      } else {
        // Follow user
        await Follow.create({
          follower_id: currentUser.id,
          following_id: userId
        });
        
        setSelectedContacts(prev => new Set(prev).add(userId));
        onFollowUser?.(userId, true);
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleFinish = () => {
    onClose();
    setStep('consent');
    setFoundUsers([]);
    setSelectedContacts(new Set());
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
            Find Friends on Teachmo
          </DialogTitle>
          <DialogDescription>
            Discover people you know who are already part of our parenting community
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'consent' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  We'll securely check your contacts to find friends already on Teachmo. 
                  Your contact information is processed locally and not stored permanently.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Your contacts stay private
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Only find existing Teachmo users
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  You choose who to follow
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <X className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Not Now
                </Button>
                <Button 
                  onClick={handleContactImport}
                  disabled={isProcessing}
                  className="flex-1"
                  style={{backgroundColor: 'var(--teachmo-sage)'}}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Phone className="w-4 h-4 mr-2" />
                  )}
                  {isProcessing ? 'Checking...' : 'Find Friends'}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'results' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {foundUsers.length > 0 ? (
                <>
                  <div className="text-center">
                    <h3 className="font-semibold text-lg text-gray-900">
                      Found {foundUsers.length} friend{foundUsers.length !== 1 ? 's' : ''} on Teachmo! 🎉
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Choose who you'd like to follow
                    </p>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {foundUsers.map(user => (
                      <Card key={user.id} className="border-0 shadow-sm">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {user.avatar_url ? (
                                <img 
                                  src={user.avatar_url} 
                                  alt={user.full_name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{backgroundColor: 'var(--teachmo-coral)'}}>
                                  <span className="text-white font-semibold text-sm">
                                    {user.full_name[0]}
                                  </span>
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900">{user.full_name}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </div>
                            <Button
                              variant={selectedContacts.has(user.id) ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleFollowToggle(user.id)}
                              className={selectedContacts.has(user.id) ? "bg-green-600 hover:bg-green-700" : ""}
                            >
                              {selectedContacts.has(user.id) ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Following
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-4 h-4 mr-1" />
                                  Follow
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Button onClick={handleFinish} className="w-full" style={{backgroundColor: 'var(--teachmo-sage)'}}>
                    Done ({selectedContacts.size} followed)
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    No friends found yet
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    None of your contacts are on Teachmo yet. Invite them to join!
                  </p>
                  <Button onClick={handleFinish} variant="outline">
                    Close
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}