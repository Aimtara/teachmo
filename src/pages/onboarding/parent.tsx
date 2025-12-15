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

const parentOnboardingSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  phone: z
    .string()
    .min(7, 'Enter a valid phone number')
    .regex(/^[0-9+\-() ]+$/, 'Phone number can only include digits and basic symbols'),
  city: z.string().min(2, 'City is required'),
  schoolId: z.string().min(2, 'School ID is required'),
  childrenCount: z
    .coerce.number().int().min(1, 'At least one child is required'),
  notes: z.string().optional()
});

const CREATE_PARENT_PROFILE = `
  mutation CreateParentProfile($input: profiles_insert_input!) {
    insert_profiles_one(object: $input) {
      id
      user_id
    }
  }
`;

const LINK_PARENT_SCHOOL = `
  mutation LinkParentSchool($parentId: uuid!, $schoolId: uuid!) {
    insert_parent_school_links_one(object: { parent_id: $parentId, school_id: $schoolId }) {
      id
    }
  }
`;

const ASSIGN_PARENT_ROLE = `
  mutation AssignParentRole($userId: uuid!) {
    insert_user_roles_one(object: { user_id: $userId, role: "parent" }) {
      id
      role
    }
  }
`;

type ParentFormValues = z.infer<typeof parentOnboardingSchema>;

export default function ParentOnboardingPage() {
  const user = useUserData();
  const navigate = useNavigate();
  const { toast } = useToast();

  const defaultValues = useMemo(
    () => ({
      firstName: user?.displayName?.split(' ')[0] || '',
      lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
      phone: '',
      city: '',
      schoolId: '',
      childrenCount: 1,
      notes: ''
    }),
    [user]
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ParentFormValues>({
    resolver: zodResolver(parentOnboardingSchema),
    defaultValues
  });

  const onSubmit = async (values: ParentFormValues) => {
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
      city: values.city,
      role: 'parent',
      notes: values.notes,
      children_count: values.childrenCount,
      school_id: values.schoolId
    };

    const { error: profileError, data: profileData } = await nhost.graphql.request(CREATE_PARENT_PROFILE, {
      input: profileInput
    });

    if (profileError || !profileData?.insert_profiles_one?.id) {
      console.error('Failed to create parent profile', profileError);
      toast({
        variant: 'destructive',
        title: 'Could not save your profile',
        description: 'Please check your details and try again.'
      });
      return;
    }

    const profileId = profileData.insert_profiles_one.id;

    const { error: linkError } = await nhost.graphql.request(LINK_PARENT_SCHOOL, {
      parentId: profileId,
      schoolId: values.schoolId
    });

    if (linkError) {
      console.error('Failed to link school', linkError);
      toast({
        variant: 'destructive',
        title: 'School connection failed',
        description: 'We saved your profile, but could not connect your school. Please try again.'
      });
      return;
    }

    const { error: roleError } = await nhost.graphql.request(ASSIGN_PARENT_ROLE, {
      userId: user.id
    });

    if (roleError) {
      console.error('Failed to assign parent role', roleError);
      toast({
        variant: 'destructive',
        title: 'Role assignment failed',
        description: 'Your profile is saved but we could not finalize your access. Contact support if this continues.'
      });
      return;
    }

    toast({
      title: 'Welcome to Teachmo!',
      description: 'Your profile is set up and connected to your school.'
    });

    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium text-blue-600">Parent onboarding</p>
          <h1 className="text-3xl font-bold text-slate-900 mt-2">Tell us about your family</h1>
          <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
            We use these details to personalize recommendations, connect you with your school, and set up the right parent
            experience.
          </p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle>Parent details</CardTitle>
            <CardDescription>Share a few details so we can tailor Teachmo to your family.</CardDescription>
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
                  <Label htmlFor="city">City</Label>
                  <Input id="city" autoComplete="address-level2" placeholder="City" {...register('city')} />
                  {errors.city && <p className="text-sm text-red-600">{errors.city.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolId">School ID</Label>
                  <Input id="schoolId" placeholder="Enter your school's ID" {...register('schoolId')} />
                  {errors.schoolId && <p className="text-sm text-red-600">{errors.schoolId.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="childrenCount">Number of children</Label>
                  <Input id="childrenCount" type="number" min={1} {...register('childrenCount')} />
                  {errors.childrenCount && <p className="text-sm text-red-600">{errors.childrenCount.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">What should we know?</Label>
                <Textarea
                  id="notes"
                  placeholder="Tell us about your child's interests, learning goals, or support needs"
                  rows={4}
                  {...register('notes')}
                />
                {errors.notes && <p className="text-sm text-red-600">{errors.notes.message}</p>}
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
