import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, CheckCircle, Calendar } from "lucide-react";
import { format, isThisWeek, isThisMonth } from "date-fns";

const categoryColors = {
  communication: "bg-blue-100 text-blue-800",
  discipline: "bg-red-100 text-red-800", 
  development: "bg-green-100 text-green-800",
  education: "bg-purple-100 text-purple-800",
  health: "bg-pink-100 text-pink-800",
  creativity: "bg-orange-100 text-orange-800",
  social_skills: "bg-cyan-100 text-cyan-800",
  emotional_intelligence: "bg-indigo-100 text-indigo-800",
  independence: "bg-yellow-100 text-yellow-800",
  confidence: "bg-emerald-100 text-emerald-800"
};

export default function TipsProgress({ tips }) {
  const readTips = tips.filter(tip => tip.is_read);
  const thisWeekTips = tips.filter(tip => isThisWeek(new Date(tip.created_date)));
  const thisMonthTips = tips.filter(tip => isThisMonth(new Date(tip.created_date)));
  
  const categoryStats = tips.reduce((acc, tip) => {
    const category = tip.category;
    if (!acc[category]) {
      acc[category] = { total: 0, read: 0 };
    }
    acc[category].total++;
    if (tip.is_read) {
      acc[category].read++;
    }
    return acc;
  }, {});

  const completionRate = tips.length > 0 ? (readTips.length / tips.length) * 100 : 0;

  return (
    <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
          Parenting Tips Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{tips.length}</p>
            <p className="text-sm text-gray-600">Total Tips</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{readTips.length}</p>
            <p className="text-sm text-gray-600">Implemented</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold" style={{color: 'var(--teachmo-sage)'}}>
              {completionRate.toFixed(0)}%
            </p>
            <p className="text-sm text-gray-600">Completion</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{readTips.length}/{tips.length}</span>
          </div>
          <Progress value={completionRate} className="h-3" />
        </div>

        {Object.keys(categoryStats).length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Tips by Category</h3>
            {Object.entries(categoryStats)
              .sort(([,a], [,b]) => b.total - a.total)
              .slice(0, 5)
              .map(([category, stats]) => (
                <div key={category} className="flex items-center justify-between">
                  <Badge className={categoryColors[category] || "bg-gray-100 text-gray-800"}>
                    {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {stats.read}/{stats.total}
                    </span>
                    {stats.read === stats.total && stats.total > 0 && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}

        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">This Week</span>
            <span className="font-medium">{thisWeekTips.length} tips</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">This Month</span>
            <span className="font-medium">{thisMonthTips.length} tips</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}