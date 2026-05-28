import { z } from 'zod';

const phoneRegex = /^[\d\s\-+()]{7,20}$/;

/**
 * Zod schema for platform signup form validation.
 * @property communityName - Community name (required)
 * @property subdomain - URL subdomain (required, lowercase alphanumeric + hyphens, min 3 chars)
 * @property firstName - Admin first name (required)
 * @property lastName - Admin last name (required)
 * @property email - Admin email address (required, valid email)
 * @property phone - Admin phone number (optional)
 * @property password - Admin password (required, min 8 chars)
 * @property confirmPassword - Password confirmation (must match password)
 * @property plan - Subscription tier (foundation/depth/core)
 */
export const signupSchema = z
  .object({
    communityName: z.string().min(1, 'Community name is required').max(100, 'Name too long').trim(),
    subdomain: z
      .string()
      .min(1, 'Subdomain is required')
      .min(3, 'Subdomain must be at least 3 characters')
      .max(50, 'Subdomain too long')
      .regex(
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
        'Subdomain must start and end with alphanumeric, contain only lowercase letters, numbers, and hyphens'
      ),
    firstName: z.string().min(1, 'First name is required').max(50, 'First name too long').trim(),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long').trim(),
    email: z.string().min(1, 'Email is required').email('Invalid email address').toLowerCase(),
    phone: z.string().regex(phoneRegex, 'Invalid phone number format').optional().or(z.literal('')),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    plan: z.enum(['foundation', 'depth', 'core']),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type SignupFormData = z.infer<typeof signupSchema>;
