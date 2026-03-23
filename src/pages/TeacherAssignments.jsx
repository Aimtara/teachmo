import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Calendar } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/hooks/useAuth';
import { OrgService } from '@/services/org/api';
import AssignmentsView from '@/components/teacher/AssignmentsView';

/**
 * TeacherAssignments page
 *
 * Lists assignments for the teacher's classes. If a specific course_id is provided
 * via query param, it will show assignments for that course using the
 * AssignmentsView component. Otherwise, it lists all of the teacher's
 * courses with links to view assignments for each class.
 */
export default function TeacherAssignments() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const courseIdParam = searchParams.get('course_id');
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadClasses = async () => {
      if (!user) return;
      setLoading(true);
      setLoadError('');
      try {
        const classData = await OrgService.getClassrooms(user.id);
        const mappedClasses = classData.map((course) => ({
          course,
          studentCount: course.studentCount ?? 0
        }));
        setClasses(mappedClasses);
        // If course_id param is present, set selected class
        if (courseIdParam) {
          const found = mappedClasses.find(c => c.course.id === courseIdParam);
          setSelectedClass(found || null);
        }
      } catch (error) {
        console.error('Failed to load teacher classes:', error);
        setClasses([]);
        setSelectedClass(null);
        setLoadError('Unable to load your classes right now.');
      } finally {
        setLoading(false);
      }
    };
    loadClasses();
  }, [user, courseIdParam, retryCount]);

  // Render assignments for a selected class
  if (!loading && selectedClass) {
    return (
      <ProtectedRoute allowedRoles={['teacher', 'school_admin', 'district_admin', 'system_admin', 'admin']} requireAuth={true}>
        <div className="min-h-screen bg-warm-cream p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            <header>
              <Link to={createPageUrl('TeacherAssignments')}>
                <Button variant="ghost" size="sm" className="mb-4 pl-0">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to all classes
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {selectedClass.course.name} Assignments
              </h1>
              <p className="text-gray-600">
                Manage assignments for this class (students: {selectedClass.studentCount})
              </p>
            </header>
            <AssignmentsView classData={{ course: selectedClass.course, studentCount: selectedClass.studentCount }} currentUser={user} />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Render list of classes with links to assignments
  return (
    <ProtectedRoute allowedRoles={['teacher', 'school_admin', 'district_admin', 'system_admin', 'admin']} requireAuth={true}>
      <div className="min-h-screen bg-warm-cream p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <header>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Assignments</h1>
            <p className="text-gray-600">
              Create and manage assignments for your classes
            </p>
          </header>
          {!loading && loadError && (
            <Card>
              <CardContent className="p-8 text-center space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Could not load classes</h3>
                <p className="text-gray-600" role="alert">{loadError}</p>
                <div className="flex justify-center gap-3">
                  <Button onClick={() => setRetryCount((prev) => prev + 1)}>Retry</Button>
                  <Link to={createPageUrl('TeacherClasses')}>
                    <Button variant="outline">Go to Classes</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
          {!loading && !loadError && courseIdParam && !selectedClass && (
            <Card>
              <CardContent className="p-8 text-center space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Class not found</h3>
                <p className="text-gray-600">
                  We could not find the class you requested. It may no longer be available.
                </p>
                <div className="flex justify-center gap-3">
                  <Link to={createPageUrl('TeacherAssignments')}>
                    <Button>Back to all classes</Button>
                  </Link>
                  <Link to={createPageUrl('TeacherClasses')}>
                    <Button variant="outline">Go to Classes</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
          {loading && (
            <p className="text-gray-500">Loading your classes…</p>
          )}
          {!loading && !loadError && !courseIdParam && classes.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center space-y-4">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto" />
                <h3 className="text-lg font-semibold text-gray-900">No classes found</h3>
                <p className="text-gray-600">You do not have any classes yet. Connect Google Classroom or create a class to begin.</p>
                <div className="flex justify-center gap-4">
                  <Link to={createPageUrl('TeacherClasses')}>
                    <Button variant="outline">Go to Classes</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
          {!loading && !loadError && classes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls) => (
                <Card key={cls.course.id} className="bg-white border border-gray-200 shadow-sm">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">{cls.course.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600">Students: {cls.studentCount}</p>
                    <div className="flex gap-2">
                      <Link to={createPageUrl(`TeacherAssignments?course_id=${cls.course.id}`)}>
                        <Button size="sm" variant="outline">View Assignments</Button>
                      </Link>
                      <Link to={createPageUrl('TeacherClasses')}>
                        <Button size="sm" variant="outline">View Class</Button>
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
