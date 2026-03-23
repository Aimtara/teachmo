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

const parentOnboardingSchema = z.object({
  firstName: z.string().trim().min(2, 'First name is required'),
  lastName: z.string().trim().min(2, 'Last name is required'),
  phone: z
    .string()
    .min(7, 'Enter a valid phone number')
    .regex(/^[0-9+\-() ]+$/, 'Phone number can only include digits and basic symbols'),
  city: z.string().min(2, 'City is required'),
  schoolId: z
    .string()
    .trim()
    .refine(
      (val) => !val || UUID_REGEX.test(val),
      { message: 'School ID must be a valid UUID (e.g. 123e4567-e89b-12d3-a456-426614174000)' }
    )
    .optional(),
  childrenCount: z
    .coerce.number().int().min(1, 'At least one child is required'),
  notes: z.string().optional()
});

const UPDATE_PARENT_PROFILE = `
  mutation UpdateParentProfile($userId: uuid!, $input: profiles_set_input!) {
    update_profiles(where: { user_id: { _eq: $userId } }, _set: $input) {
      affected_rows
      returning {
        id
      }
    }
  }
`;

const CREATE_PARENT_PROFILE = `
  mutation CreateParentProfile($input: profiles_insert_input!) {
    insert_profiles_one(object: $input) {
      id
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

type ParentFormValues = z.infer<typeof parentOnboardingSchema>;

export default function ParentOnboardingPage() {
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
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<ParentFormValues>({
    resolver: zodResolver(parentOnboardingSchema),
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

  // Deny access to users who already have a non-parent role (they shouldn't complete parent onboarding).
  if (isAuthenticated && role && role !== 'parent') {
    return <Navigate to="/unauthorized" replace />;
  }

  // Users who have already completed onboarding don't need to be here.
  if (isAuthenticated && !needsOnboarding) {
    return <Navigate to={defaultPath} replace />;
  }

  const onSubmit = async (values: ParentFormValues) => {
    if (!user?.id) {
      toast({
        variant: 'destructive',
        title: 'You need to be signed in to continue',
        description: 'Please log in again and restart onboarding.'
      });
      return;
    }

    const normalizedSchoolId = values.schoolId?.trim();

    const profileSetInput = {
      full_name: `${values.firstName} ${values.lastName}`.trim(),
      app_role: 'parent',
      organization_id: null,
      school_id: normalizedSchoolId || null,
      phone: values.phone?.trim() || null,
      city: values.city?.trim() || null,
      children_count: values.childrenCount ?? null,
      notes: values.notes?.trim() || null
    };

    const { error: updateError, data: updateData } = await nhost.graphql.request(UPDATE_PARENT_PROFILE, {
      userId: user.id,
      input: profileSetInput
    });

    if (updateError) {
      console.error('Failed to update parent profile', updateError);
      toast({
        variant: 'destructive',
        title: 'Could not save your profile',
        description: 'Please check your details and try again.'
      });
      return;
    }

    let profileId = updateData?.update_profiles?.returning?.[0]?.id ?? null;

    if (!profileId) {
      const { error: insertError, data: insertData } = await nhost.graphql.request(CREATE_PARENT_PROFILE, {
        input: {
          user_id: user.id,
          ...profileSetInput,
        }
      });

      profileId = insertData?.insert_profiles_one?.id ?? null;

      if (insertError || !profileId) {
        const normalizedInsertError = normalizeHasuraError(insertError);

        if (normalizedInsertError.kind === 'constraint') {
          const { error: retryUpdateError, data: retryUpdateData } = await nhost.graphql.request(UPDATE_PARENT_PROFILE, {
            userId: user.id,
            input: profileSetInput
          });

          profileId = retryUpdateData?.update_profiles?.returning?.[0]?.id ?? null;
          if (!retryUpdateError && profileId) {
            // another request inserted the profile between our update and insert attempts
          } else {
            console.error('Failed to reconcile parent profile after insert conflict', retryUpdateError || insertError);
            toast({
              variant: 'destructive',
              title: 'Could not save your profile',
              description: 'Please check your details and try again.'
            });
            return;
          }
        } else {
          console.error('Failed to create parent profile', insertError);
          toast({
            variant: 'destructive',
            title: 'Could not save your profile',
            description: 'Please check your details and try again.'
          });
          return;
        }
      }
    }

    if (normalizedSchoolId) {
      const { error: linkError } = await nhost.graphql.request(LINK_PARENT_SCHOOL, {
        parentId: profileId,
        schoolId: normalizedSchoolId
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
    }

    clearSavedOnboardingFlowPreference();

    toast({
      title: 'Welcome to Teachmo!',
      description: normalizedSchoolId
        ? 'Your profile is set up and connected to your school.'
        : 'Your profile is set up. You can connect a school later from settings.'
    });

    navigate(getDefaultPathForRole('parent'));
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
                  <Label htmlFor="schoolId">School ID (optional)</Label>
                  <Input id="schoolId" placeholder="If you have one, enter your school's ID" {...register('schoolId')} />
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
