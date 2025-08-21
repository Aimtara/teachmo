import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, MousePointer, Users, TrendingUp, Calendar, FileText } from 'lucide-react';

export default function PartnerAnalytics({ partner, events, resources }) {
  const analytics = useMemo(() => {
    const totalImpressions = partner.total_impressions || 0;
    const totalClicks = partner.total_clicks || 0;
    const totalRsvps = partner.total_rsvps || 0;
    
    const clickRate = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : 0;
    const conversionRate = totalClicks > 0 ? ((totalRsvps / totalClicks) * 100).toFixed(1) : 0;

    const approvedEvents = events.filter(e => e.status === 'approved');
    const approvedResources = resources.filter(r => r.status === 'approved');

    const topEvents = events
      .filter(e => e.impressions > 0)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5);

    const topResources = resources
      .filter(r => r.views > 0)
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    return {
      totalImpressions,
      totalClicks,
      totalRsvps,
      clickRate,
      conversionRate,
      approvedEvents: approvedEvents.length,
      approvedResources: approvedResources.length,
      topEvents,
      topResources
    };
  }, [partner, events, resources]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Analytics</h2>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Impressions</p>
                <p className="text-2xl font-bold">{analytics.totalImpressions.toLocaleString()}</p>
              </div>
              <Eye className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clicks</p>
                <p className="text-2xl font-bold">{analytics.totalClicks.toLocaleString()}</p>
              </div>
              <MousePointer className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Click Rate</p>
                <p className="text-2xl font-bold">{analytics.clickRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">RSVPs</p>
                <p className="text-2xl font-bold">{analytics.totalRsvps}</p>
              </div>
              <Users className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold">{analytics.conversionRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Performance */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Top Performing Events
            </CardTitle>
            <Badge variant="outline">{analytics.approvedEvents} approved</Badge>
          </CardHeader>
          <CardContent>
            {analytics.topEvents.length > 0 ? (
              <div className="space-y-3">
                {analytics.topEvents.map(event => (
                  <div key={event.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(event.start_time).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{event.impressions} views</p>
                      <p className="text-xs text-gray-600">
                        {event.clicks} clicks • {event.rsvps} RSVPs
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No event performance data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Top Performing Resources
            </CardTitle>
            <Badge variant="outline">{analytics.approvedResources} approved</Badge>
          </CardHeader>
          <CardContent>
            {analytics.topResources.length > 0 ? (
              <div className="space-y-3">
                {analytics.topResources.map(resource => (
                  <div key={resource.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{resource.title}</p>
                      <p className="text-xs text-gray-600 capitalize">{resource.type} • {resource.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{resource.views} views</p>
                      {resource.downloads > 0 && (
                        <p className="text-xs text-gray-600">{resource.downloads} downloads</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No resource performance data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900">Reach</h4>
              <p className="text-sm text-blue-700 mt-1">
                Your content has been seen {analytics.totalImpressions.toLocaleString()} times by families
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900">Engagement</h4>
              <p className="text-sm text-green-700 mt-1">
                {analytics.clickRate}% of viewers clicked to learn more about your offerings
              </p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <h4 className="font-semibold text-orange-900">Impact</h4>
              <p className="text-sm text-orange-700 mt-1">
                {analytics.totalRsvps} families have expressed interest in your events
              </p>
            </div>
          </div>

          {analytics.totalImpressions === 0 && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                <strong>Get Started:</strong> Create and publish your first event or resource to start seeing analytics data.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}