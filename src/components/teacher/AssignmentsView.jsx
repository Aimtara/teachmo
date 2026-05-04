import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, Plus, RefreshCw } from 'lucide-react';
import { createAssignment, listAssignmentsByCourse } from '@/domains/assignments';
import { GoogleClassroomService } from '@/services/integrations/googleClassroom';

function formatDueDate(value) {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function deriveSubmissionCount(assignment) {
  if (typeof assignment?.submission_count === 'number') return assignment.submission_count;
  if (typeof assignment?.submissionCount === 'number') return assignment.submissionCount;
  return 0;
}

const ASSIGNMENT_FIELDS = `
  id
  title
  description
  due_at
  submission_count
  created_at
`;

export default function AssignmentsView({ classData, currentUser }) {
  const courseName = classData?.course?.name || classData?.course?.title || 'This class';
  const courseId = classData?.course?.id;

  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    dueAt: '',
  });

  const sortedAssignments = useMemo(
    () =>
      [...assignments].sort((a, b) => {
        const left = a?.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER;
        const right = b?.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER;
        return left - right;
      }),
    [assignments]
  );

  const loadAssignments = async () => {
    if (!courseId) {
      setAssignments([]);
      setLoadingAssignments(false);
      return;
    }

    setLoadingAssignments(true);
    setError('');

    try {
      const assignmentData = await listAssignmentsByCourse(String(courseId));
      setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
    } catch (loadError) {
      console.error('Failed to load assignments:', loadError);
      setError('Could not load assignments for this class.');
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleCreateAssignment = async () => {
    if (!formState.title.trim() || !courseId || !currentUser?.id) return;

    setIsCreating(true);
    setError('');

    try {
      const payload = {
        course_id: String(courseId),
        title: formState.title.trim(),
        description: formState.description.trim() || null,
        due_at: formState.dueAt ? new Date(formState.dueAt).toISOString() : null,
        status: 'active',
        teacher_user_id: String(currentUser.id),
      };

      await createAssignment(payload);
      setFormState({ title: '', description: '', dueAt: '' });
      setIsCreateOpen(false);
      await loadAssignments();
      setSyncStatus('Assignment created successfully.');
    } catch (createError) {
      console.error('Failed to create assignment:', createError);
      setError('Could not create assignment. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSyncAssignments = async () => {
    if (!currentUser?.id) {
      setError('Unable to sync assignments: missing teacher profile.');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('');
    setError('');

    try {
      const syncedCount = await GoogleClassroomService.syncAssignmentsForCourse(currentUser.id, courseId || 'all');
      setSyncStatus(`Synced ${syncedCount} assignment${syncedCount === 1 ? '' : 's'} from Google Classroom.`);
      await loadAssignments();
    } catch (syncError) {
      console.error('Failed to sync assignments:', syncError);
      setError('Could not sync assignments right now.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-xl">Assignments</CardTitle>
            <p className="text-sm text-gray-600">
              {courseName} • Students: {classData?.studentCount ?? '—'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Assignment
            </Button>
            <Button size="sm" variant="outline" onClick={handleSyncAssignments} disabled={isSyncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Import / Sync
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {syncStatus && <p className="text-sm text-green-700">{syncStatus}</p>}
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}

        {loadingAssignments ? (
          <div className="space-y-2">
            {[1, 2, 3].map((row) => (
              <div key={row} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : sortedAssignments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center space-y-2">
            <FileText className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="font-medium text-gray-900">No assignments yet</p>
            <p className="text-sm text-gray-600">Create your first assignment or sync from Google Classroom.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedAssignments.map((assignment) => (
              <div key={assignment.id} className="rounded-lg border border-gray-200 p-3 bg-slate-50">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{assignment.title || 'Untitled assignment'}</p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{assignment.description || 'No description'}</p>
                  </div>
                  <Badge variant="secondary">{deriveSubmissionCount(assignment)} submissions</Badge>
                </div>
                <p className="mt-2 text-xs text-gray-600 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Due: {formatDueDate(assignment.due_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create assignment</DialogTitle>
            <DialogDescription>Add a new assignment for {courseName}.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800" htmlFor="assignment-title">
                Title
              </label>
              <Input
                id="assignment-title"
                value={formState.title}
                onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="e.g. Week 4 Math Practice"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800" htmlFor="assignment-description">
                Description
              </label>
              <Textarea
                id="assignment-description"
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Add instructions for students"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800" htmlFor="assignment-due-at">
                Due date
              </label>
              <Input
                id="assignment-due-at"
                type="datetime-local"
                value={formState.dueAt}
                onChange={(event) => setFormState((prev) => ({ ...prev, dueAt: event.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreateAssignment} disabled={isCreating || !formState.title.trim()}>
              {isCreating ? 'Creating…' : 'Create Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

AssignmentsView.propTypes = {
  classData: PropTypes.shape({
    studentCount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    course: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      title: PropTypes.string,
    }),
  }),
  currentUser: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
};
