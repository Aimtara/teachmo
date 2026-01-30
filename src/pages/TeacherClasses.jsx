import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/components/shared/InternationalizationProvider';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Users, RefreshCw } from 'lucide-react';
import { useAuth } from '@/components/hooks/useAuth';
import { Course, Enrollment } from '@/api/entities';
import UniversalEmptyState from '@/components/shared/UniversalEmptyState';
import LiveSupportWidget from '@/components/widgets/LiveSupportWidget';

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
        const courses = await Course.filter({ teacher_id: user.id });
        const classData = await Promise.all(
          (courses || []).map(async (course) => {
            try {
              const enrollments = await Enrollment.filter({ course_id: course.id });
              return {
                ...course,
                studentCount: Array.isArray(enrollments) ? enrollments.length : 0,
              };
            } catch (err) {
              return { ...course, studentCount: 0 };
            }
          })
        );
        setClasses(classData);
      } catch (error) {
        console.error('Failed to fetch teacher classes:', error);
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
                Sync Classes
              </Button>
            </Link>
          </header>

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {!loading && (!classes || classes.length === 0) && (
            <UniversalEmptyState
              context="no-calendar-events"
              userType="teacher"
              className="bg-white border-dashed border-2"
            />
          )}

          {!loading && classes && classes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls) => (
                <Card
                  key={cls.id}
                  className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
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
                        <Button size="sm" variant="outline" className="w-full">
                          Assignments
                        </Button>
                      </Link>
                      <Link to={createPageUrl(`TeacherMessages?course_id=${cls.id}`)} className="w-full">
                        <Button size="sm" variant="outline" className="w-full">
                          Message
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Real support widget instead of dead-end button */}
        <LiveSupportWidget />
      </div>
    </ProtectedRoute>
  );
}
