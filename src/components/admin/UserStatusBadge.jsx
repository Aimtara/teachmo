import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Lock, 
  Ban,
  Mail 
} from 'lucide-react';

export default function UserStatusBadge({ status, className = "" }) {
  const statusConfig = {
    active: {
      label: 'Active',
      icon: CheckCircle,
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    invited: {
      label: 'Invited',
      icon: Mail,
      className: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    deactivated: {
      label: 'Deactivated',
      icon: XCircle,
      className: 'bg-gray-100 text-gray-800 border-gray-200'
    },
    system_locked: {
      label: 'Locked',
      icon: Lock,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    system_disabled: {
      label: 'Disabled',
      icon: Ban,
      className: 'bg-red-100 text-red-800 border-red-200'
    }
  };

  const config = statusConfig[status] || statusConfig.active;
  const Icon = config.icon;

  return (
    <Badge className={`${config.className} ${className} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}