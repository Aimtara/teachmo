import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/components/shared/InternationalizationProvider';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Users, RefreshCw } from 'lucide-react';
import { useAuth } from '@/components/hooks/useAuth';
import { OrgService } from '@/services/org/api';
import UniversalEmptyState from '@/components/shared/UniversalEmptyState';
import LiveSupportWidget from '@/components/widgets/LiveSupportWidget';
import { GoogleClassroomService } from '@/services/integrations/googleClassroom';

export default function TeacherClasses() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const { t } = useTranslation();

  const fetchClasses = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const classData = await OrgService.getClassrooms(user.id);
      setClasses(classData);
    } catch (fetchError) {
      console.error('Failed to fetch teacher classes:', fetchError);
      setError('Unable to load your classes right now.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleSyncClasses = async () => {
    if (!user?.id) {
      setError('Unable to sync classes: missing teacher profile.');
      return;
    }
    setSyncStatus('');
    setError('');
    setSyncing(true);
    try {
      const result = await GoogleClassroomService.syncCourses(user.id);
      setSyncStatus(`Synced ${result.syncedCourses || 0} classes from Google Classroom.`);
      await fetchClasses();
    } catch (syncError) {
      console.error('Failed to sync classes:', syncError);
      setError('Could not sync classes right now. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['teacher', 'school_admin', 'district_admin', 'system_admin', 'admin']} requireAuth={true}>
      <div className="min-h-screen bg-warm-cream p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <header className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('teacher_classes.title')}</h1>
              <p className="text-gray-600">{t('teacher_classes.description')}</p>
            </div>
            <Button variant="outline" className="gap-2" onClick={handleSyncClasses} disabled={syncing}>
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync Classes'}
            </Button>
          </header>

          {syncStatus && <p className="text-sm text-green-700">{syncStatus}</p>}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <p className="text-sm text-red-700" role="alert">{error}</p>
                <Button size="sm" variant="outline" onClick={fetchClasses}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          )}

          {!loading && (!classes || classes.length === 0) && (
            <UniversalEmptyState
              context="no-classes"
              userType="teacher"
              className="bg-white border-dashed border-2"
            />
          )}

          {(!loading) && classes && classes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls) => (
                <Card key={cls.id} className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 line-clamp-1">{cls.name}</h3>
                        <p className="text-sm text-gray-500">{cls.studentCount} Students</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Link to={createPageUrl(`TeacherAssignments?course_id=${cls.id}`)} className="w-full">
                        <Button size="sm" variant="outline" className="w-full">Assignments</Button>
                      </Link>
                      <Link to={createPageUrl(`TeacherMessages?course_id=${cls.id}`)} className="w-full">
                        <Button size="sm" variant="outline" className="w-full">Message</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        <LiveSupportWidget />
      </div>
    </ProtectedRoute>
  );
}
