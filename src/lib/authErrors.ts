/**
 * Formats Supabase and network errors into clean, user-friendly messages.
 * Never displays raw technical dumps or unhandled stack traces.
 */
export function formatAuthError(error: any): string {
  if (!error) return 'An unexpected authentication error occurred. Please try again.';

  const message = typeof error === 'string' ? error : error.message || '';
  const lower = message.toLowerCase();

  // 1. Invalid login credentials
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_credentials') ||
    lower.includes('invalid email or password') ||
    lower.includes('bad credentials')
  ) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }

  // 2. Email not confirmed
  if (
    lower.includes('email not confirmed') ||
    lower.includes('unconfirmed email') ||
    lower.includes('email_not_confirmed')
  ) {
    return 'Your email has not been confirmed yet. Please check your inbox for the confirmation link.';
  }

  // 3. Email already registered
  if (
    lower.includes('user already registered') ||
    lower.includes('already exists') ||
    lower.includes('email address is already in use') ||
    lower.includes('email already registered')
  ) {
    return 'An account with this email already exists. Try signing in or resetting your password.';
  }

  // 4. Email rate limit exceeded
  if (
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('too many requests')
  ) {
    return 'Too many email requests have been sent recently. Please wait a few minutes before trying again.';
  }

  // 5. Password too short / weak password
  if (
    lower.includes('password should be at least') ||
    lower.includes('password too short') ||
    lower.includes('weak password') ||
    lower.includes('password must be')
  ) {
    return 'Password is too short. Please choose a password with at least 6 characters.';
  }

  // 6. Auth session expired / invalid reset link token / session missing
  // Checked BEFORE network errors so auth token failures are never masked as connection problems
  if (
    lower.includes('token has expired') ||
    lower.includes('otp expired') ||
    lower.includes('otp_expired') ||
    lower.includes('token is invalid') ||
    lower.includes('email link is invalid') ||
    lower.includes('access_denied') ||
    lower.includes('recovery link') ||
    lower.includes('session missing') ||
    lower.includes('auth session missing') ||
    lower.includes('invalid_grant') ||
    lower.includes('pkce') ||
    lower.includes('code challenge') ||
    lower.includes('code_verifier') ||
    lower.includes('refresh token') ||
    lower.includes('refresh_token_not_found') ||
    lower.includes('jwt expired')
  ) {
    return 'Your reset link has expired or is invalid. Please request a new one.';
  }

  // 7. Invalid email format
  if (
    lower.includes('invalid email') ||
    lower.includes('email_address_invalid') ||
    lower.includes('unable to validate email')
  ) {
    return 'Please provide a valid email address.';
  }

  // 8. Network error / connection failure
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network error') ||
    lower.includes('network request failed') ||
    lower.includes('connection refused') ||
    lower.includes('fetch error')
  ) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return 'Network connection problem. Please verify your internet connection and try again.';
    }
    return 'Unable to reach the authentication service. Please check your connection and try again.';
  }

  // 9. Fallback: sanitize user message or clean fallback
  if (message.length > 0 && message.length < 120 && !message.includes('{') && !message.includes('http')) {
    return message;
  }

  return 'Unable to complete authentication. Please try again in a moment.';
}
