import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/config/api';

export default function PartnerTraining() {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const partnerId = 'demo';

  const load = async () => {
    const [cs, ens] = await Promise.all([
      fetch(`${API_BASE_URL}/courses`).then((r) => r.json()),
      fetch(`${API_BASE_URL}/courses/enrollments/${partnerId}`).then((r) => r.json()),
    ]);
    setCourses(cs);
    setEnrollments(ens);
  };

  useEffect(() => { load(); }, []);

  const enroll = async (courseId) => {
    await fetch(`${API_BASE_URL}/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerId }),
    });
    load();
  };

  const complete = async (courseId, moduleId) => {
    await fetch(`${API_BASE_URL}/courses/${courseId}/modules/${moduleId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerId }),
    });
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
