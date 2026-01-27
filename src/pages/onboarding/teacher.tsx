import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUserData } from '@nhost/react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { nhost } from '@/lib/nhostClient';

const teacherOnboardingSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  phone: z
    .string()
    .min(7, 'Enter a valid phone number')
    .regex(/^[0-9+\-() ]+$/, 'Phone number can only include digits and basic symbols'),
  schoolId: z.string().min(2, 'School ID is required'),
  subjects: z.string().min(2, 'Please tell us what you teach'),
  grades: z.string().min(1, 'List at least one grade level'),
  teachingFocus: z.string().optional()
});

const CREATE_TEACHER_PROFILE = `
  mutation CreateTeacherProfile($input: user_profiles_insert_input!) {
    insert_user_profiles_one(object: $input) {
      user_id
    }
  }
`;

const ASSIGN_TEACHER_ROLE = `
  mutation AssignTeacherRole($userId: uuid!) {
    insert_user_roles_one(object: { user_id: $userId, role: "teacher" }) {
      id
      role
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
    formState: { errors, isSubmitting }
  } = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherOnboardingSchema),
    defaultValues
  });

  const onSubmit = async (values: TeacherFormValues) => {
    if (!user?.id) {
      toast({
        variant: 'destructive',
        title: 'You need to be signed in to continue',
        description: 'Please log in again and restart onboarding.'
      });
      return;
    }

    const profileInput = {
      user_id: user.id,
      first_name: values.firstName,
      last_name: values.lastName,
      phone: values.phone,
      school_id: values.schoolId,
      subjects: values.subjects,
      grades: values.grades,
      bio: values.bio,
      role: 'teacher'
    };

    const { error: profileError, data: profileData } = await nhost.graphql.request(CREATE_TEACHER_PROFILE, {
      input: profileInput
    });

    if (profileError || !profileData?.insert_user_profiles_one?.user_id) {
      console.error('Failed to create teacher profile', profileError);
      toast({
        variant: 'destructive',
        title: 'Could not save your profile',
        description: 'Please verify the details and try again.'
      });
      return;
    }

    const teacherProfileId = profileData.insert_user_profiles_one.user_id;

    const { error: linkError } = await nhost.graphql.request(CONNECT_TEACHER_SCHOOL, {
      teacherId: teacherProfileId,
      schoolId: values.schoolId
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

    const { error: roleError } = await nhost.graphql.request(ASSIGN_TEACHER_ROLE, {
      userId: user.id
    });

    if (roleError) {
      console.error('Failed to assign teacher role', roleError);
      toast({
        variant: 'destructive',
        title: 'Role assignment failed',
        description: 'Your profile is saved but we could not finalize your access. Contact support if this continues.'
      });
      return;
    }

    toast({
      title: 'Welcome to Teachmo!',
      description: 'Your classroom profile is ready. We connected you to your school and saved your teaching details.'
    });

    navigate('/teacher/dashboard');
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
