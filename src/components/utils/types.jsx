// Core type definitions for Teachmo application
// Note: Using JSDoc for type hints since we can't use .ts files

/**
 * @typedef {Object} BaseUser
 * @property {string} id
 * @property {string} email
 * @property {string} full_name
 * @property {'parent'|'teacher'|'school_admin'|'district_admin'|'system_admin'|'admin'} role
 * @property {'active'|'invited'|'deactivated'|'system_locked'|'system_disabled'} status
 * @property {string} created_date
 * @property {string} updated_date
 */

/**
 * @typedef {BaseUser & {
 *   role: 'parent',
 *   avatar_url?: string,
 *   location?: string,
 *   subscription_tier: 'free'|'premium',
 *   login_streak: number,
 *   points: number,
 *   onboarding_completed: boolean,
 *   parenting_style?: 'authoritative'|'gentle'|'positive'|'attachment'|'montessori'|'balanced',
 *   current_mood?: 'energized'|'calm'|'tired'|'stressed'|'happy'|'overwhelmed'
 * }} ParentUser
 */

/**
 * @typedef {BaseUser & {
 *   role: 'teacher',
 *   school_id: string,
 *   employee_id?: string,
 *   google_classroom_connected: boolean
 * }} TeacherUser
 */

/**
 * @typedef {BaseUser & {
 *   role: 'school_admin'|'district_admin'|'system_admin'|'admin',
 *   school_id?: string,
 *   district_id?: string,
 *   admin_permissions?: Record<string, boolean>
 * }} AdminUser
 */

/**
 * @typedef {ParentUser|TeacherUser|AdminUser} User
 */

/**
 * @typedef {Object} AgeRange
 * @property {number} min_age
 * @property {number} max_age
 */

/**
 * @typedef {Object} Child
 * @property {string} id
 * @property {string} name
 * @property {number} age
 * @property {string} birth_date
 * @property {string} [grade_level]
 * @property {string} [school_name]
 * @property {string} [school_domain]
 * @property {'visual'|'auditory'|'kinesthetic'|'not_sure'} [learning_style]
 * @property {string[]} interests
 * @property {string[]} challenges
 * @property {string} avatar
 * @property {string} color
 * @property {string[]} development_goals
 * @property {string[]} personality_traits
 * @property {boolean} onboarded
 * @property {string} created_date
 * @property {string} created_by
 */

/**
 * @typedef {Object} Activity
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {'creative'|'educational'|'physical'|'social'|'emotional'|'problem_solving'|'science'|'art'|'music'|'outdoor'} category
 * @property {AgeRange} [age_range]
 * @property {string} [duration]
 * @property {string[]} materials_needed
 * @property {string[]} instructions
 * @property {string[]} learning_objectives
 * @property {string} [why_it_matters]
 * @property {string} [teachmo_tip]
 * @property {string[]} variations
 * @property {string[]} skill_tracks_supported
 * @property {string} [child_id]
 * @property {'suggested'|'planned'|'completed'|'skipped'} status
 * @property {string} [completion_date]
 * @property {number} [rating]
 * @property {boolean} is_personalized
 * @property {boolean} is_customized
 * @property {boolean} is_sponsored
 * @property {string} created_date
 * @property {string} created_by
 */

/**
 * @typedef {Object} ApiError
 * @property {string} message
 * @property {string} [code]
 * @property {number} [status]
 * @property {Record<string, unknown>} [details]
 */

/**
 * @typedef {'auth'|'permission'|'not_found'|'rate_limit'|'server'|'network'|'validation'|'general'} ErrorType
 */

/**
 * @typedef {Object} LoadingState
 * @property {Record<string, boolean>} [key]
 */

/**
 * @typedef {Object} ErrorState
 * @property {Record<string, ApiError|null>} [key]
 */

/**
 * @typedef {Object} FilterParams
 * @property {Record<string, string|number|boolean|string[]|undefined>} [key]
 */

/**
 * @typedef {Object} EntityMethods
 * @property {function(string=, number=): Promise<Array>} list
 * @property {function(FilterParams, string=, number=): Promise<Array>} filter
 * @property {function(Object): Promise<Object>} create
 * @property {function(string, Object): Promise<Object>} update
 * @property {function(string): Promise<void>} delete
 * @property {function(string): Promise<Object>} [get]
 * @property {function(Array<Object>): Promise<Array>} [bulkCreate]
 */

// Export type checking functions
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidAge = (age) => {
  return age >= 0 && age <= 18 && Number.isInteger(age);
};

export const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

export const isValidAgeRange = (ageRange) => {
  return (
    isValidAge(ageRange.min_age) &&
    isValidAge(ageRange.max_age) &&
    ageRange.min_age <= ageRange.max_age
  );
};

export const isNonEmptyString = (value) => {
  return typeof value === 'string' && value.trim().length > 0;
};

export const isNonEmptyArray = (array) => {
  return Array.isArray(array) && array.length > 0;
};