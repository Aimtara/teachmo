import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { partnerRequest } from '@/api/partner/client';

export default function PartnerTraining() {
  const tenant = useTenant();
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  const load = async () => {
    if (!tenant.organizationId) return;
    const [cs, ens] = await Promise.all([
      partnerRequest('/courses', { method: 'GET' }, tenant),
      partnerRequest('/courses/enrollments/me', { method: 'GET' }, tenant)
    ]);
    setCourses(cs);
    setEnrollments(ens);
  };

  useEffect(() => { load(); }, [tenant.organizationId]);

  const enroll = async (courseId) => {
    await partnerRequest(`/courses/${courseId}/enroll`, { method: 'POST' }, tenant);
    load();
  };

  const complete = async (courseId, moduleId) => {
    await partnerRequest(`/courses/${courseId}/modules/${moduleId}/complete`, { method: 'POST' }, tenant);
    load();
  };

  const enrollmentMap = Object.fromEntries(enrollments.map((e) => [e.courseId, e]));

  return (
    <div>
      <h1>Training Courses</h1>
      {courses.map((c) => {
        const enrollment = enrollmentMap[c.id];
        const completed = enrollment ? enrollment.completedModules.length : 0;
        return (
          <div key={c.id} style={{ border: '1px solid #ccc', margin: '1rem', padding: '1rem' }}>
            <h2>{c.title}</h2>
            <p>{c.description}</p>
            {!enrollment && <button onClick={() => enroll(c.id)}>Enroll</button>}
            {enrollment && (
              <div>
                <p>Progress: {completed}/{c.modules.length}</p>
                {c.modules.map((m) => (
                  <div key={m.id}>
                    {m.title}{' '}
                    {!enrollment.completedModules.includes(m.id) && (
                      <button onClick={() => complete(c.id, m.id)}>Complete</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
