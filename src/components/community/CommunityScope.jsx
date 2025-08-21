import React, { useState, useEffect } from 'react';
import { CommunityVisibility, User } from '@/api/entities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Globe, Building, School, Shield } from 'lucide-react';

export default function CommunityScope({ user, onScopeChange }) {
  const [currentScope, setCurrentScope] = useState('global');
  const [availableScopes, setAvailableScopes] = useState([]);

  useEffect(() => {
    const loadUserScope = async () => {
      try {
        const visibilityData = await CommunityVisibility.filter({ user_id: user.id });
        const visibility = visibilityData[0] || { visibility_scope: 'global' };
        setCurrentScope(visibility.visibility_scope);
      } catch (error) {
        console.error('Error loading user scope:', error);
      }
    };

    if (user) {
      loadUserScope();
      determineAvailableScopes(user);
    }
  }, [user]);

  const determineAvailableScopes = (user) => {
    const scopes = [
      {
        value: 'global',
        label: 'Global Community',
        description: 'All Teachmo parents worldwide',
        icon: Globe,
        badge: null
      }
    ];

    if (user.district_id) {
      scopes.unshift({
        value: 'district',
        label: 'My District',
        description: 'Parents and staff in my school district',
        icon: Building,
        badge: 'District'
      });
    }

    if (user.school_id) {
      scopes.unshift({
        value: 'school',
        label: 'My School',
        description: 'Parents and staff at my school',
        icon: School,
        badge: 'School'
      });
    }

    setAvailableScopes(scopes);
  };

  const handleScopeChange = (newScope) => {
    setCurrentScope(newScope);
    if (onScopeChange) {
      onScopeChange(newScope);
    }
  };

  const getCurrentScopeInfo = () => {
    return availableScopes.find(scope => scope.value === currentScope);
  };

  const currentInfo = getCurrentScopeInfo();

  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {currentInfo?.icon && <currentInfo.icon className="w-5 h-5 text-gray-600" />}
            <span className="font-medium text-gray-900">Community View:</span>
          </div>
          
          {currentInfo?.badge && (
            <Badge variant="outline" className="text-xs">
              {currentInfo.badge}
            </Badge>
          )}
        </div>

        <Select value={currentScope} onValueChange={handleScopeChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableScopes.map((scope) => {
              const IconComponent = scope.icon;
              return (
                <SelectItem key={scope.value} value={scope.value}>
                  <div className="flex items-center gap-2 w-full">
                    <IconComponent className="w-4 h-4" />
                    <div className="flex-1">
                      <div className="font-medium">{scope.label}</div>
                      <div className="text-xs text-gray-500">{scope.description}</div>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {currentScope !== 'global' && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <Shield className="w-4 h-4" />
            <p className="text-sm font-medium">
              {currentScope === 'school' ? 'School Community' : 'District Community'}
            </p>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            You're viewing content from your educational community. Switch to "Global" to see all parents.
          </p>
        </div>
      )}
    </div>
  );
}