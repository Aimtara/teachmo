import { useEffect, useMemo, useState } from 'react';
import { useAuthenticationStatus } from '@nhost/react';
import { Navigate } from 'react-router-dom';
import { API_BASE_URL } from '@/config/api';
import { useTenant } from '@/contexts/TenantContext';
import { nhost } from '@/lib/nhostClient';

export default function TeacherDashboard() {
  const { isAuthenticated } = useAuthenticationStatus();
  const tenant = useTenant();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || tenant.loading || !tenant.organizationId) return;
    const load = async () => {
      setLoading(true);
      try {
        const token = await nhost.auth.getAccessToken();
        const headers = {};
        if (token) headers.authorization = `Bearer ${token}`;
        headers['x-teachmo-org-id'] = tenant.organizationId;
        if (tenant.schoolId) headers['x-teachmo-school-id'] = tenant.schoolId;
        const [courseList, enrollmentList] = await Promise.all([
          fetch(`${API_BASE_URL}/courses`, { headers }).then((res) => res.json()),
          fetch(`${API_BASE_URL}/courses/enrollments/me`, { headers }).then((res) => res.json())
        ]);
        setCourses(courseList);
        setEnrollments(enrollmentList);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated, tenant.loading, tenant.organizationId, tenant.schoolId]);

  const enrollmentMap = useMemo(
    () => Object.fromEntries(enrollments.map((enrollment) => [enrollment.courseId, enrollment])),
    [enrollments]
  );

  if (!isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-gray-900">Teacher dashboard</h1>
        <p className="text-gray-600">Track training modules, class enrollments, and completions.</p>
      </header>

      {loading && <p className="text-gray-600">Loading courses…</p>}
      {error && (
        <p className="text-red-600" role="alert">
          Unable to load teacher data. {error.message}
        </p>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {courses.map((course) => {
            const enrollment = enrollmentMap[course.id];
            const completed = enrollment?.completedModules?.length || 0;
            const totalModules = course.modules?.length || 0;
            return (
              <div key={course.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{course.title}</h2>
                    <p className="text-sm text-gray-600">{course.description}</p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {completed}/{totalModules} modules complete
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {course.modules?.map((module) => (
                    <div
                      key={module.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-slate-50 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{module.title}</p>
                        <p className="text-xs text-gray-600">{module.content}</p>
                      </div>
                      {enrollment?.completedModules?.includes(module.id) ? (
                        <span className="text-green-700 text-sm font-semibold">Completed</span>
                      ) : (
                        <span className="text-gray-500 text-sm">Pending</span>
                      )}
                    </div>
                  ))}
                  {(!course.modules || course.modules.length === 0) && (
                    <p className="text-sm text-gray-500">No modules are available for this course yet.</p>
                  )}
                </div>
              </div>
            );
          })}
          {courses.length === 0 && (
            <p className="text-sm text-gray-500">No teacher training courses found.</p>
          )}
        </div>
      )}
    </div>
  );
}
