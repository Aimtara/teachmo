import React, { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthenticationStatus, useUserData } from '@nhost/react';
import { Navigate, useNavigate } from 'react-router-dom';

import { getDefaultPathForRole, useUserRoleState } from '@/hooks/useUserRole';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { nhost } from '@/lib/nhostClient';
import { clearSavedOnboardingFlowPreference } from '@/lib/onboardingFlow';
import { normalizeHasuraError } from '@/lib/hasuraErrors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const teacherOnboardingSchema = z.object({
  firstName: z.string().trim().min(2, 'First name is required'),
  lastName: z.string().trim().min(2, 'Last name is required'),
  phone: z
    .string()
    .min(7, 'Enter a valid phone number')
    .regex(/^[0-9+\-() ]+$/, 'Phone number can only include digits and basic symbols'),
  schoolId: z
    .string()
    .trim()
    .refine((val) => UUID_REGEX.test(val), {
      message: 'School ID must be a valid UUID (e.g. 123e4567-e89b-12d3-a456-426614174000)'
    }),
  subjects: z.string().min(2, 'Please tell us what you teach'),
  grades: z.string().min(1, 'List at least one grade level'),
  bio: z.string().optional()
});

const UPDATE_TEACHER_PROFILE = `
  mutation UpdateTeacherProfile($userId: uuid!, $input: profiles_set_input!) {
    update_profiles(where: { user_id: { _eq: $userId } }, _set: $input) {
      affected_rows
      returning {
        id
      }
    }
  }
`;

const CREATE_TEACHER_PROFILE = `
  mutation CreateTeacherProfile($input: profiles_insert_input!) {
    insert_profiles_one(object: $input) {
      id
    }
  }
`;

const CONNECT_TEACHER_SCHOOL = `
  mutation ConnectTeacherSchool($teacherId: uuid!, $schoolId: uuid!) {
    insert_teacher_school_links_one(object: { teacher_id: $teacherId, school_id: $schoolId }) {
      id
    }
  }
`;

type TeacherFormValues = z.infer<typeof teacherOnboardingSchema>;

export default function TeacherOnboardingPage() {
  const user = useUserData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuthenticationStatus();
  const { role, loading: roleLoading, needsOnboarding } = useUserRoleState();
  const defaultPath = getDefaultPathForRole(role);

  const defaultValues = useMemo(
    () => ({
      firstName: user?.displayName?.split(' ')[0] || '',
      lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
      phone: '',
      schoolId: '',
      subjects: '',
      grades: '',
      bio: ''
    }),
    [user]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherOnboardingSchema),
    defaultValues
  });

  const hydratedDisplayNameRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const nextDisplayName = user.displayName ?? '';
    if (hydratedDisplayNameRef.current === nextDisplayName) return;
    if (isDirty) return;

    reset(defaultValues);
    hydratedDisplayNameRef.current = nextDisplayName;
  }, [defaultValues, isDirty, reset, user?.displayName, user?.id]);

  if (authLoading || roleLoading) {
    return <div role="status" aria-live="polite" className="p-6 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  // Deny access to users who already have a non-teacher role (they shouldn't complete teacher onboarding).
  if (isAuthenticated && role && role !== 'teacher') {
    return <Navigate to="/unauthorized" replace />;
  }

  // Users who have already completed onboarding don't need to be here.
  if (isAuthenticated && !needsOnboarding) {
    return <Navigate to={defaultPath} replace />;
  }

  const onSubmit = async (values: TeacherFormValues) => {
    if (!user?.id) {
      toast({
        variant: 'destructive',
        title: 'You need to be signed in to continue',
        description: 'Please log in again and restart onboarding.'
      });
      return;
    }

    const normalizedSchoolId = values.schoolId.trim();

    const profileSetInput = {
      full_name: `${values.firstName} ${values.lastName}`.trim(),
      app_role: 'teacher',
      school_id: normalizedSchoolId
    };

    const { error: updateError, data: updateData } = await nhost.graphql.request(UPDATE_TEACHER_PROFILE, {
      userId: user.id,
      input: profileSetInput
    });

    if (updateError) {
      console.error('Failed to update teacher profile', updateError);
      toast({
        variant: 'destructive',
        title: 'Could not save your profile',
        description: 'Please verify the details and try again.'
      });
      return;
    }

    let teacherProfileId = updateData?.update_profiles?.returning?.[0]?.id ?? null;

    if (!teacherProfileId) {
      const { error: insertError, data: insertData } = await nhost.graphql.request(CREATE_TEACHER_PROFILE, {
        input: {
          user_id: user.id,
          ...profileSetInput,
        }
      });

      teacherProfileId = insertData?.insert_profiles_one?.id ?? null;

      if (insertError || !teacherProfileId) {
        const normalizedInsertError = normalizeHasuraError(insertError);

        if (normalizedInsertError.kind === 'constraint') {
          const { error: retryUpdateError, data: retryUpdateData } = await nhost.graphql.request(UPDATE_TEACHER_PROFILE, {
            userId: user.id,
            input: profileSetInput
          });

          teacherProfileId = retryUpdateData?.update_profiles?.returning?.[0]?.id ?? null;
          if (!retryUpdateError && teacherProfileId) {
            // another request inserted the profile between our update and insert attempts
          } else {
            console.error('Failed to reconcile teacher profile after insert conflict', retryUpdateError || insertError);
            toast({
              variant: 'destructive',
              title: 'Could not save your profile',
              description: 'Please verify the details and try again.'
            });
            return;
          }
        } else {
          console.error('Failed to create teacher profile', insertError);
          toast({
            variant: 'destructive',
            title: 'Could not save your profile',
            description: 'Please verify the details and try again.'
          });
          return;
        }
      }
    }

    const { error: linkError } = await nhost.graphql.request(CONNECT_TEACHER_SCHOOL, {
      teacherId: teacherProfileId,
      schoolId: normalizedSchoolId
    });

    if (linkError) {
      console.error('Failed to connect teacher to school', linkError);
      toast({
        variant: 'destructive',
        title: 'School connection failed',
        description: 'Your profile is saved but we could not connect to your school. Please try again.'
      });
      return;
    }

    clearSavedOnboardingFlowPreference();

    toast({
      title: 'Welcome to Teachmo!',
      description: 'Your classroom profile is ready. We connected you to your school and saved your teaching details.'
    });

    navigate(getDefaultPathForRole('teacher'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium text-indigo-600">Teacher onboarding</p>
          <h1 className="text-3xl font-bold text-slate-900 mt-2">Set up your classroom profile</h1>
          <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
            Add your teaching details so we can personalize resources, connect you with parents, and assign the right role.
          </p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle>Teacher details</CardTitle>
            <CardDescription>Share the basics of your classroom so we can get everything ready.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" autoComplete="given-name" {...register('firstName')} />
                  {errors.firstName && <p className="text-sm text-red-600">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" autoComplete="family-name" {...register('lastName')} />
                  {errors.lastName && <p className="text-sm text-red-600">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile number</Label>
                  <Input id="phone" placeholder="(555) 123-4567" {...register('phone')} />
                  {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolId">School ID</Label>
                  <Input id="schoolId" placeholder="Enter your school's ID" {...register('schoolId')} />
                  {errors.schoolId && <p className="text-sm text-red-600">{errors.schoolId.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subjects">Subjects</Label>
                  <Input id="subjects" placeholder="e.g., Math, Science" {...register('subjects')} />
                  {errors.subjects && <p className="text-sm text-red-600">{errors.subjects.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grades">Grade levels</Label>
                  <Input id="grades" placeholder="e.g., 3rd-5th" {...register('grades')} />
                  {errors.grades && <p className="text-sm text-red-600">{errors.grades.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Teaching focus</Label>
                <Textarea
                  id="bio"
                  placeholder="Share your teaching philosophy, classroom goals, or experience"
                  rows={4}
                  {...register('bio')}
                />
                {errors.bio && <p className="text-sm text-red-600">{errors.bio.message}</p>}
              </div>

              <Button className="w-full md:w-auto" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Complete setup'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
