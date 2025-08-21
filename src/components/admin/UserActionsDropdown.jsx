import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Edit, 
  UserX, 
  UserCheck, 
  Lock, 
  Ban, 
  Trash2,
  Mail
} from 'lucide-react';

export default function UserActionsDropdown({ 
  user, 
  currentUserRole, 
  onEdit, 
  onDeactivate, 
  onReactivate, 
  onLock, 
  onDisable, 
  onDelete,
  onResendInvite 
}) {
  
  const canManageUser = () => {
    // System admins can manage anyone
    if (['system_admin', 'admin'].includes(currentUserRole)) {
      return true;
    }
    
    // District admins can manage users in their district  
    if (currentUserRole === 'district_admin') {
      return user.district_id === currentUserRole.district_id;
    }
    
    // School admins can manage users in their school
    if (currentUserRole === 'school_admin') {
      return user.school_id === currentUserRole.school_id;
    }
    
    return false;
  };

  const canDeactivate = () => {
    return ['school_admin', 'district_admin'].includes(currentUserRole) && 
           user.status === 'active' && 
           !['system_admin', 'admin'].includes(user.role);
  };

  const canReactivate = () => {
    if (user.status === 'system_locked' || user.status === 'system_disabled') {
      return ['system_admin', 'admin'].includes(currentUserRole);
    }
    return user.status === 'deactivated' && canManageUser();
  };

  const canLockOrDisable = () => {
    return ['system_admin', 'admin'].includes(currentUserRole) && 
           user.status === 'active';
  };

  const canDelete = () => {
    return ['system_admin', 'admin'].includes(currentUserRole) && 
           !['system_admin', 'admin'].includes(user.role);
  };

  const canResendInvite = () => {
    return user.status === 'invited' && canManageUser();
  };

  if (!canManageUser()) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Basic Actions */}
        <DropdownMenuItem onClick={() => onEdit(user)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit User
        </DropdownMenuItem>

        {canResendInvite() && (
          <DropdownMenuItem onClick={() => onResendInvite(user)}>
            <Mail className="mr-2 h-4 w-4" />
            Resend Invite
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Status Management */}
        {canDeactivate() && (
          <DropdownMenuItem 
            onClick={() => onDeactivate(user)}
            className="text-orange-600 focus:text-orange-600"
          >
            <UserX className="mr-2 h-4 w-4" />
            Remove Access
          </DropdownMenuItem>
        )}

        {canReactivate() && (
          <DropdownMenuItem 
            onClick={() => onReactivate(user)}
            className="text-green-600 focus:text-green-600"
          >
            <UserCheck className="mr-2 h-4 w-4" />
            Reactivate
          </DropdownMenuItem>
        )}

        {/* System Admin Actions */}
        {canLockOrDisable() && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onLock(user)}
              className="text-yellow-600 focus:text-yellow-600"
            >
              <Lock className="mr-2 h-4 w-4" />
              Lock Account
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => onDisable(user)}
              className="text-red-600 focus:text-red-600"
            >
              <Ban className="mr-2 h-4 w-4" />
              Disable Account
            </DropdownMenuItem>
          </>
        )}

        {/* Destructive Actions */}
        {canDelete() && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(user)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Permanently
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}