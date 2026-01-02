import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/components/shared/InternationalizationProvider';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ultraMinimalToast } from '@/components/shared/UltraMinimalToast';
import { BookOpen, MessageCircle, Users } from 'lucide-react';
import { useAuth } from '@/components/hooks/useAuth';
import { Course, Enrollment } from '@/api/entities';

/**
 * TeacherClasses page
 *
 * This page lists the classes assigned to the logged-in teacher. It will fetch
 * courses from the Base44 backend by filtering courses where the teacher_id matches
 * the current user's id. It then displays a card for each class with its name,
 * number of enrolled students, and a link to view assignments for that class.
 *
 * If no classes are found, an empty state encourages teachers to connect Google
 * Classroom or reach out for help.
 */
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
              console.error('Failed to load enrollments for course', course.name, err);
              return {
                ...course,
                studentCount: 0
              };
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

  const handleContactSupport = () => {
    ultraMinimalToast('Support chat coming soon! For now, email support@teachmo.com', 'info');
  };

  return (
    <ProtectedRoute allowedRoles={['teacher', 'school_admin', 'district_admin', 'system_admin', 'admin']} requireAuth={true}>
      <div className="min-h-screen bg-warm-cream p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <header>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('teacher_classes.title')}</h1>
            <p className="text-gray-600">{t('teacher_classes.description')}</p>
          </header>

          {/* Show loading state */}
          {loading && (
            <p className="text-gray-500">Loading your classes…</p>
          )}

          {/* Empty state or help section */}
          {!loading && (!classes || classes.length === 0) && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">{t('teacher_classes.empty_title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  {t('teacher_classes.empty_description')}
                </p>
                <div className="flex gap-4 flex-wrap">
                  <Link to={createPageUrl('HelpCenter')}>
                    <Button variant="outline" className="gap-2" aria-label={t('teacher_classes.setup_guide')}>
                      <BookOpen className="w-4 h-4" />
                      {t('teacher_classes.setup_guide')}
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={handleContactSupport}
                    aria-label={t('teacher_classes.contact_support')}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {t('teacher_classes.contact_support')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Display classes if available */}
          {(!loading) && classes && classes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls) => (
                <Card key={cls.id} className="bg-white border border-gray-200 shadow-sm">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">{cls.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('teacher_classes.students')}: {cls.studentCount}
                    </p>
                    <div className="flex gap-2">
                      <Link to={createPageUrl(`TeacherAssignments?course_id=${cls.id}`)}>
                        <Button size="sm" variant="outline">View Assignments</Button>
                      </Link>
                      <Link to={createPageUrl(`TeacherMessages?course_id=${cls.id}`)}>
                        <Button size="sm" variant="outline">Message Parents</Button>
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
