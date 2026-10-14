import React, { useState, useEffect } from 'react';
import {
  Lock,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { supabase } from '../lib/supabase';
import { formatAuthError } from '../lib/authErrors';

interface ResetPasswordScreenProps {
  onReturnToSignIn?: () => void;
  onRequestNewLink?: () => void;
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  onReturnToSignIn,
  onRequestNewLink,
}) => {
  const {
    recoverySessionDetected,
    setRecoverySessionDetected,
    setIsPasswordRecoveryActive,
    setAuthViewMode,
    signOut,
  } = usePlan();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  // Check URL parameters and verify Supabase recovery session without racing detectSessionInUrl
  useEffect(() => {
    let isMounted = true;
    let authListenerSubscription: any = null;

    const initRecoverySession = async () => {
      if (typeof window === 'undefined') return;

      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const searchParams = new URLSearchParams(search);
      const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

      // 1. Check URL parameters for explicit expired or invalid token reports from Supabase
      const errorParam =
        searchParams.get('error') ||
        hashParams.get('error') ||
        searchParams.get('error_code') ||
        hashParams.get('error_code');
      const errorDesc =
        searchParams.get('error_description') ||
        hashParams.get('error_description') ||
        '';

      if (
        errorParam ||
        errorDesc.toLowerCase().includes('expired') ||
        errorDesc.toLowerCase().includes('invalid') ||
        hash.includes('otp_expired') ||
        search.includes('otp_expired')
      ) {
        if (isMounted) {
          setError('Your reset link has expired or is invalid. Please request a new one.');
          setIsVerifying(false);
        }
        return;
      }

      if (!supabase) {
        if (isMounted) {
          setError('Supabase is not configured. Please check your environment configuration.');
          setIsVerifying(false);
        }
        return;
      }

      // 2. Check if recovery session is already detected in context or current session
      if (recoverySessionDetected && isMounted) {
        setHasValidSession(true);
        setIsVerifying(false);
        setError(null);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          setHasValidSession(true);
          setRecoverySessionDetected(true);
          setIsPasswordRecoveryActive(true);
          setIsVerifying(false);
          setError(null);
          return;
        }
      } catch (err) {
        console.warn('Initial session check caught:', err);
      }

      // 3. Register listener for Supabase's automatic detectSessionInUrl
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;
        if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session?.user) {
          setHasValidSession(true);
          setRecoverySessionDetected(true);
          setIsPasswordRecoveryActive(true);
          setIsVerifying(false);
          setError(null);
        }
      });
      authListenerSubscription = subscription;

      // 4. Give Supabase detectSessionInUrl up to 1500ms to process the URL tokens
      await new Promise((resolve) => setTimeout(resolve, 1500));
      if (!isMounted) return;

      // Check session again after wait
      try {
        const { data: { session: postSession } } = await supabase.auth.getSession();
        if (postSession?.user && isMounted) {
          setHasValidSession(true);
          setRecoverySessionDetected(true);
          setIsPasswordRecoveryActive(true);
          setIsVerifying(false);
          setError(null);
          return;
        }
      } catch (err) {
        console.warn('Post-wait session check:', err);
      }

      // 5. Fallback only if no session established and tokens/code still remain in URL
      const code = searchParams.get('code');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || '';

      if (code) {
        try {
          const { data: codeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (codeData?.session?.user && isMounted) {
            setHasValidSession(true);
            setRecoverySessionDetected(true);
            setIsPasswordRecoveryActive(true);
            setIsVerifying(false);
            setError(null);
            return;
          }
          if (exchangeError && isMounted) {
            setError(formatAuthError(exchangeError));
            setIsVerifying(false);
            return;
          }
        } catch (err: any) {
          if (isMounted) {
            setError(formatAuthError(err));
            setIsVerifying(false);
          }
          return;
        }
      } else if (accessToken) {
        try {
          const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setSessionData?.session?.user && isMounted) {
            setHasValidSession(true);
            setRecoverySessionDetected(true);
            setIsPasswordRecoveryActive(true);
            setIsVerifying(false);
            setError(null);
            return;
          }
          if (setSessionError && isMounted) {
            setError(formatAuthError(setSessionError));
            setIsVerifying(false);
            return;
          }
        } catch (err: any) {
          if (isMounted) {
            setError(formatAuthError(err));
            setIsVerifying(false);
          }
          return;
        }
      }

      // 6. Verification completed: show accurate message if no recovery session could be established
      if (isMounted) {
        setIsVerifying(false);
        if (!hasValidSession && !recoverySessionDetected) {
          setError('Your reset link has expired or is invalid. Please request a new one.');
        }
      }
    };

    initRecoverySession();

    return () => {
      isMounted = false;
      if (authListenerSubscription) {
        authListenerSubscription.unsubscribe();
      }
    };
  }, []);

  // If context signals recoverySessionDetected became true, clear error and stop verifying
  useEffect(() => {
    if (recoverySessionDetected) {
      setHasValidSession(true);
      setIsVerifying(false);
      setError((prev) => {
        if (prev && (prev.includes('expired') || prev.includes('invalid') || prev.includes('missing'))) {
          return null;
        }
        return prev;
      });
    }
  }, [recoverySessionDetected]);

  const handleReturnToSignIn = () => {
    setIsPasswordRecoveryActive(false);
    setRecoverySessionDetected(false);
    setAuthViewMode('signin');

    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }

    if (onReturnToSignIn) {
      onReturnToSignIn();
    }
  };

  const handleRequestNewLink = () => {
    setIsPasswordRecoveryActive(false);
    setRecoverySessionDetected(false);
    setAuthViewMode('forgot');

    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }

    if (onRequestNewLink) {
      onRequestNewLink();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    // Validation: password length
    if (!newPassword) {
      setError('Please enter your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    // Validation: passwords match
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match. Please verify.");
      return;
    }

    if (!supabase) {
      setError('Supabase is not configured. Please check your environment configuration.');
      return;
    }

    // Validation: recovery session presence before invoking updateUser
    let { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      // Check if hash has access_token that can establish session
      const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
      const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || '';
      if (accessToken) {
        try {
          const { data: setSessionData } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          session = setSessionData?.session;
        } catch {
          // ignore
        }
      }
    }

    if (!session?.user && !recoverySessionDetected && !hasValidSession) {
      setError('Your reset link has expired or is invalid. Please request a new one.');
      return;
    }

    setLoading(true);

    try {
      // Supabase v2 API call: updateUser({ password })
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        const msg = updateError.message ? updateError.message.toLowerCase() : '';
        if (
          msg.includes('expired') ||
          msg.includes('invalid') ||
          msg.includes('session missing') ||
          msg.includes('not authorized') ||
          msg.includes('jwt') ||
          msg.includes('token')
        ) {
          setError('Your reset link has expired or is invalid. Please request a new one.');
        } else {
          setError(formatAuthError(updateError));
        }
      } else {
        // Success: show success view, sign out recovery session, clear recovery state
        setIsSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        setError(null);

        try {
          await signOut();
        } catch (signOutErr) {
          console.warn('Sign out after password reset warning:', signOutErr);
        }

        setIsPasswordRecoveryActive(false);
        setRecoverySessionDetected(false);
        setHasValidSession(false);

        // Clean any hash or query parameters from the browser address bar
        if (typeof window !== 'undefined' && (window.location.hash || window.location.search)) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="planlist-reset-password-page"
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-100"
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 flex items-center justify-center mb-3.5 border border-indigo-400/30">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <span className="text-xs font-black tracking-wider uppercase text-indigo-400 mb-1">
            PlanList
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Reset Password
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Secure password recovery for your account.
          </p>
        </div>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 text-slate-800">
          {/* Verification Loading State */}
          {isVerifying ? (
            <div
              id="reset-password-verifying-view"
              className="text-center py-8 space-y-4 animate-in fade-in duration-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner border border-indigo-100">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Verifying password reset link...
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Please wait while we establish your secure recovery session.
                </p>
              </div>
            </div>
          ) : isSuccess ? (
            <div
              id="reset-password-success-view"
              className="text-center py-4 space-y-4 animate-in fade-in duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Password updated successfully.
                </h2>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed max-w-xs mx-auto">
                  Your password has been changed. You can now return to the sign in screen and log in with your new password.
                </p>
              </div>
              <button
                id="return-to-signin-success-btn"
                type="button"
                onClick={handleReturnToSignIn}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Return to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Reset Password Form: Contains ONLY New password, Confirm new password, Update password button */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div
                  id="reset-password-error-alert"
                  className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium leading-relaxed block">{error}</span>
                    {(error.toLowerCase().includes('expired') ||
                      error.toLowerCase().includes('invalid') ||
                      error.toLowerCase().includes('missing') ||
                      error.toLowerCase().includes('request a new')) && (
                      <button
                        id="reset-request-new-link-btn"
                        type="button"
                        onClick={handleRequestNewLink}
                        className="mt-2 inline-flex items-center text-xs font-bold text-rose-900 underline hover:text-rose-950 cursor-pointer"
                      >
                        Request a new reset link
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Show form inputs when session is valid or recovery session is active */}
              {(hasValidSession || recoverySessionDetected || !error) ? (
                <>
                  {/* 1. New Password */}
                  <div>
                    <label
                      htmlFor="reset-new-password"
                      className="block text-xs font-bold text-slate-700 mb-1.5"
                    >
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="reset-new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 6 characters)"
                        autoComplete="new-password"
                        className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* 2. Confirm New Password */}
                  <div>
                    <label
                      htmlFor="reset-confirm-password"
                      className="block text-xs font-bold text-slate-700 mb-1.5"
                    >
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="reset-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                        className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* 3. Update Password Button */}
                  <button
                    id="reset-update-password-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating password...</span>
                      </>
                    ) : (
                      <>
                        <span>Update Password</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </>
              ) : null}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleReturnToSignIn}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Development-Only Diagnostic Requirement */}
          <div
            id="reset-password-dev-diagnostic"
            className="mt-6 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-center shadow-inner"
          >
            {recoverySessionDetected || hasValidSession ? (
              <span className="text-emerald-400 font-semibold">
                Recovery session detected
              </span>
            ) : (
              <span className="text-amber-400 font-semibold">
                Recovery session was not detected.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
