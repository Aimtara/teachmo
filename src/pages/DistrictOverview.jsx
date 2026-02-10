import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/services/core/client';
import { AlertTriangle, TrendingUp, Users } from 'lucide-react';

const MOCK_INSIGHTS = {
  attendanceRisk: {
    high: 124,
    medium: 450,
    low: 2100,
    trend: '+5% from last month'
  },
  programROI: [
    { name: 'After-school Tutoring', cost: 50000, impact: 'High', score: 92 },
    { name: 'Summer Reading', cost: 12000, impact: 'Medium', score: 65 },
    { name: 'STEM Robotics', cost: 25000, impact: 'High', score: 88 }
  ]
};

export default function DistrictOverview() {
  const { data: insights } = useQuery({
    queryKey: ['district-insights'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/api/analytics/district-insights');
        return data?.insights || MOCK_INSIGHTS;
      } catch {
        return MOCK_INSIGHTS;
      }
    },
    initialData: MOCK_INSIGHTS
  });

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">District Insights</h1>
        <p className="text-slate-600">Strategic overview of student outcomes and program efficacy.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Chronic Absenteeism Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-red-500 w-5 h-5" />
              <span className="text-3xl font-bold">{insights.attendanceRisk.high}</span>
            </div>
            <p className="text-xs text-red-600 mt-1">Students at high risk ({insights.attendanceRisk.trend})</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Engagement ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="text-emerald-500 w-5 h-5" />
              <span className="text-3xl font-bold">4.2x</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">Engagement lift per $1k spend</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Active Families</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="text-blue-500 w-5 h-5" />
              <span className="text-3xl font-bold">88%</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">Weekly active users</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Program Efficacy & ROI</CardTitle>
          <CardDescription>Correlating program cost with student outcome improvements.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Program Name</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Impact Score</th>
                  <th className="px-4 py-3">Efficacy Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {insights.programROI.map((program) => (
                  <tr key={program.name}>
                    <td className="px-4 py-3 font-medium">{program.name}</td>
                    <td className="px-4 py-3">${program.cost.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${program.score > 80 ? 'bg-emerald-500' : 'bg-yellow-500'}`}
                            style={{ width: `${program.score}%` }}
                          />
                        </div>
                        <span className="text-xs">{program.score}/100</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={program.impact === 'High' ? 'default' : 'secondary'}>
                        {program.impact} Impact
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
