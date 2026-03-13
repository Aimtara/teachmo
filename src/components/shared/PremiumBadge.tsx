import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

type PremiumBadgeProps = {
  className?: string;
};

export default function PremiumBadge({ className = '' }: PremiumBadgeProps) {
  return (
    <Badge className={`bg-gradient-to-r from-purple-500 to-pink-500 text-white ${className}`}>
      <Crown className="w-3 h-3 mr-1" />
      Premium
    </Badge>
  );
}
