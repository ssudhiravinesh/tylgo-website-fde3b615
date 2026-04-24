/**
 * Safely extracts a human-readable message from an unknown error.
 * 
 * Use this instead of `(error: any) => error.message` patterns
 * throughout the codebase. Handles Error instances, Supabase errors
 * (which have a .message property), and unknown types.
 * 
 * Usage:
 *   import { getErrorMessage } from '@/utils/errorUtils';
 *   
 *   catch (error: unknown) {
 *     toast.error(getErrorMessage(error, 'Failed to save'));
 *   }
 */

export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  if (typeof error === 'string') return error;
  return fallback;
}
