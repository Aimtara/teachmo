import React, { useState, useEffect } from 'react';
import { SchoolParticipationRequest, SchoolDirectory } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  School, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  BarChart3,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SchoolIntegrationWidget() {
  const [stats, setStats] = useState({
    totalRequests: 0,
    newRequests: 0,
    integratedSchools: 0,
    pendingRequests: 0,
    topRequestedSchools: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);

      // Get all school participation requests
      const requests = await SchoolParticipationRequest.list('-requested_at');
      
      // Get integrated schools count
      const integratedSchools = await SchoolDirectory.filter({ integration_enabled: true });

      // Calculate stats
      const newRequests = requests.filter(r => r.status === 'new').length;
      const pendingRequests = requests.filter(r => ['new', 'in_review'].includes(r.status)).length;

      // Calculate top requested schools
      const schoolCounts = {};
      requests.forEach(request => {
        const schoolName = request.school_name;
        schoolCounts[schoolName] = (schoolCounts[schoolName] || 0) + 1;
      });

      const topRequestedSchools = Object.entries(schoolCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([school, count]) => ({
          name: school,
          requests: count,
          status: requests.find(r => r.school_name === school)?.status || 'new'
        }));

      setStats({
        totalRequests: requests.length,
        newRequests,
        integratedSchools: integratedSchools.length,
        pendingRequests,
        topRequestedSchools
      });

    } catch (error) {
      console.error('Error loading integration stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'in_review': return 'bg-yellow-100 text-yellow-800';
      case 'added': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="w-5 h-5" />
            School Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <School className="w-5 h-5 text-blue-600" />
          School Integration Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.totalRequests}</div>
            <div className="text-xs text-gray-600">Total Requests</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.integratedSchools}</div>
            <div className="text-xs text-gray-600">Integrated</div>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">{stats.pendingRequests}</div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.newRequests}</div>
            <div className="text-xs text-gray-600">New Today</div>
          </div>
        </div>

        {/* Action Items */}
        {stats.newRequests > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {stats.newRequests} new school request{stats.newRequests > 1 ? 's' : ''} need attention
                  </span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Review and process parent requests for school integration
                </p>
              </div>
              <Link to={createPageUrl('SchoolRequests')}>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Review Now
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Top Requested Schools */}
        {stats.topRequestedSchools.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-gray-600" />
              <h4 className="font-medium text-gray-900">Most Requested Schools</h4>
            </div>
            <div className="space-y-2">
              {stats.topRequestedSchools.map((school, index) => (
                <div 
                  key={school.name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{school.name}</p>
                      <p className="text-xs text-gray-600">{school.requests} request{school.requests > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(school.status)} text-xs`}>
                    {school.status === 'added' ? 'Integrated' : 'Pending'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="border-t pt-4">
          <div className="flex gap-2">
            <Link to={createPageUrl('SchoolRequests')} className="flex-1">
              <Button variant="outline" className="w-full">
                <BarChart3 className="w-4 h-4 mr-2" />
                View All Requests
              </Button>
            </Link>
            <Link to={createPageUrl('SystemAdminDashboard')} className="flex-1">
              <Button variant="outline" className="w-full">
                <School className="w-4 h-4 mr-2" />
                School Directory
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}