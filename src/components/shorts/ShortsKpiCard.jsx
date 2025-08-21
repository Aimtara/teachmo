import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function ShortsKpiCard({ label, value, sub, className = "" }) {
  return (
    <Card className={`shadow-sm ${className}`}>
      <CardContent className="p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-semibold text-gray-900 mt-1">{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}