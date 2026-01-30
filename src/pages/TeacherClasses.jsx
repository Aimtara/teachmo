import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/components/shared/InternationalizationProvider';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ultraMinimalToast } from '@/components/shared/UltraMinimalToast';
import { Users, RefreshCw, ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/hooks/useAuth';
import { Course, Enrollment } from '@/api/entities';

export default function TeacherClasses() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Fetch courses taught by this teacher
        const courses = await Course.filter({ teacher_id: user.id });
        // For each course, determine student count via Enrollment entity
        const classData = await Promise.all(
          (courses || []).map(async (course) => {
            try {
              const enrollments = await Enrollment.filter({ course_id: course.id });
              return {
                ...course,
                studentCount: Array.isArray(enrollments) ? enrollments.length : 0
              };
            } catch (err) {
              return { ...course, studentCount: 0 };
            }
          })
        );
        setClasses(classData);
      } catch (error) {
        console.error('Failed to fetch teacher classes:', error);
        ultraMinimalToast('Unable to load classes. Please try again later.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [user]);

  return (
    <ProtectedRoute allowedRoles={['teacher', 'school_admin', 'district_admin', 'system_admin', 'admin']} requireAuth={true}>
      <div className="min-h-screen bg-warm-cream p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <header className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('teacher_classes.title')}</h1>
              <p className="text-gray-600">{t('teacher_classes.description')}</p>
            </div>
            <Link to="/settings?tab=integrations">
              <Button variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Sync Google Classroom
              </Button>
            </Link>
          </header>

          {loading && (
            <p className="text-gray-500">Loading your classes…</p>
          )}

          {!loading && (!classes || classes.length === 0) && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">{t('teacher_classes.empty_title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">{t('teacher_classes.empty_description')}</p>
                <div className="flex gap-4 flex-wrap">
                  <Link to="/settings?tab=integrations">
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                      <ExternalLink className="w-4 h-4" />
                      Connect Google Classroom
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {(!loading) && classes && classes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls) => (
                <Card key={cls.id} className="bg-white border border-gray-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                  {cls.source_type === 'google_classroom' && (
                    <div className="absolute top-0 right-0 p-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-0 text-xs">
                        Synced
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-4 space-y-4 pt-6">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${cls.source_type === 'google_classroom' ? 'bg-green-100' : 'bg-blue-100'}`}>
                        {cls.source_type === 'google_classroom' ? (
                          <RefreshCw className="w-5 h-5 text-green-600" />
                        ) : (
                          <Users className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">{cls.name}</h3>
                        <p className="text-xs text-gray-500 line-clamp-1">{cls.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      {cls.studentCount} Students
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Link to={createPageUrl(`TeacherAssignments?course_id=${cls.id}`)} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full">Assignments</Button>
                      </Link>
                      <Link to={createPageUrl(`TeacherMessages?course_id=${cls.id}`)} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full">Message</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
