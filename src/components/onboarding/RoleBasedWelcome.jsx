import React from 'react';
import { Button } from '@/components/ui/button';
import { User, Briefcase, Building, Shield } from 'lucide-react';

const roles = [
  {
    id: 'parent',
    title: 'Parent or Guardian',
    description: "Get personalized activities, parenting tips, and track your child's progress.",
    icon: User,
  },
  {
    id: 'teacher',
    title: 'Teacher',
    description: 'Sync with your class, find curriculum-aligned activities, and communicate with parents.',
    icon: Briefcase,
  },
  {
    id: 'school_admin',
    title: 'School Administrator',
    description: "Oversee school-wide usage, manage users, and view analytics for your institution.",
    icon: Building,
  },
  {
    id: 'system_admin',
    title: 'System Administrator',
    description: 'Manage all aspects of the Teachmo platform, including districts, schools, and users.',
    icon: Shield,
  },
];

export default function RoleBasedWelcome({ onSelectRole }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-gray-900">Welcome to Teachmo!</h1>
      <p className="text-lg text-gray-600 mb-8">To get started, please select your primary role.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role) => (
          <Button
            key={role.id}
            variant="outline"
            className="h-auto p-6 text-left flex flex-col items-start justify-start hover:bg-gray-50/80 transition-all duration-200"
            onClick={() => onSelectRole(role.id)}
          >
            <div className="flex items-center mb-3">
              <role.icon className="w-6 h-6 mr-3 text-blue-600" />
              <span className="font-semibold text-base text-gray-800">{role.title}</span>
            </div>
            <p className="text-sm text-gray-500 whitespace-normal">
              {role.description}
            </p>
          </Button>
        ))}
      </div>
    </div>
  );
}

export { RoleBasedWelcome };
