import React, { useState } from 'react';
import {
  CalendarCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { formatAuthError } from '../lib/authErrors';

interface AuthScreenProps {
  initialMode?: 'signin' | 'signup' | 'forgot';
  onEnterGuest?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'signin',
  onEnterGuest,
}) => {
  const {
    signIn,
    signUp,
    sendPasswordResetEmail,
    authViewMode,
    setAuthViewMode,
  } = usePlan();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(
    authViewMode === 'signup' || authViewMode === 'forgot'
      ? authViewMode
      : initialMode || 'signin'
  );

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const switchMode = (newMode: 'signin' | 'signup' | 'forgot') => {
    setMode(newMode);
    setAuthViewMode(newMode);
    setError(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();

    // Mode: Forgot Password - Send recovery email with exact redirect to /reset-password
    if (mode === 'forgot') {
      if (!trimmedEmail) {
        setError('Please enter your email address.');
        return;
      }
      setLoading(true);
      try {
        const result = await sendPasswordResetEmail(trimmedEmail);
        if (result.error) {
          setError(result.error);
        } else {
          setSuccessMessage(
            `Password reset link sent! Check ${trimmedEmail} for instructions to reset your password.`
          );
        }
      } catch (err: any) {
        setError(formatAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Common validations for signin and signup
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const result = await signIn(trimmedEmail, password);
        if (result.error) {
          setError(result.error);
        }
      } else {
        // Sign Up with full name saved in user_metadata
        const result = await signUp(trimmedEmail, password, fullName.trim());
        if (result.error) {
          setError(result.error);
        } else if (result.needsEmailConfirmation) {
          setSuccessMessage(
            `Account created! A confirmation email was dispatched to ${trimmedEmail}. Please confirm to complete verification.`
          );
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
      id="planlist-auth-container"
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

          {mode === 'signin' && (
            <>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Continue planning your day.
              </p>
            </>
          )}

          {mode === 'signup' && (
            <>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Create your PlanList
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Turn your plans into action.
              </p>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Reset your password
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Enter your email and we'll send you a recovery link.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Main Form Card */}
      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 text-slate-800">
          {/* Supabase Status Banner if not connected */}
          {!isSupabaseConfigured && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex gap-2.5 items-start">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Supabase Project Configuration</p>
                <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                  Please make sure your Supabase project URL and anon key are configured in environment variables.
                </p>
              </div>
            </div>
          )}

          {/* Feedback: Error */}
          {error && (
            <div
              id="auth-error-alert"
              className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-medium leading-relaxed block">{error}</span>
              </div>
            </div>
          )}

          {/* Feedback: Success */}
          {successMessage && (
            <div
              id="auth-success-alert"
              className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-medium leading-relaxed block">{successMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* SIGN UP: Full Name */}
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="signup-name-input"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Full Name <span className="text-slate-400 font-normal">(stored in profile)</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-name-input"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    autoComplete="name"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div>
              <label
                htmlFor="auth-email-input"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 transition-all"
                />
              </div>
            </div>

            {/* Password (Visible for SIGNIN & SIGNUP) */}
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="auth-password-input"
                    className="block text-xs font-bold text-slate-700"
                  >
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      id="forgot-password-link-btn"
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2 cursor-pointer transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password (For SIGNUP only) */}
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="auth-confirm-password-input"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-confirm-password-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
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
            )}

            {/* Action Submit Button */}
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {mode === 'signin' && 'Signing in...'}
                    {mode === 'signup' && 'Creating account...'}
                    {mode === 'forgot' && 'Sending recovery link...'}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'signin' && 'Sign In'}
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'forgot' && 'Send Recovery Link'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Navigation links between Sign In / Sign Up / Forgot Password */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-3 text-xs text-slate-500 text-center">
            {mode === 'signin' && (
              <p>
                Don't have an account?{' '}
                <button
                  id="switch-to-signup-btn"
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-2 ml-1 cursor-pointer"
                >
                  Create account
                </button>
              </p>
            )}

            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button
                  id="switch-to-signin-btn"
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-2 ml-1 cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            )}

            {mode === 'forgot' && (
              <p>
                Remember your password?{' '}
                <button
                  id="back-to-signin-from-forgot-btn"
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-2 ml-1 cursor-pointer"
                >
                  Back to Sign In
                </button>
              </p>
            )}

            {/* Optional Guest Bypass */}
            {onEnterGuest && (
              <div className="pt-2">
                <button
                  id="auth-guest-bypass-btn"
                  type="button"
                  onClick={onEnterGuest}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Preview as Guest (Local Offline State)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Security & RLS Badges */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted Connection</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
            <span>Supabase Auth</span>
          </div>
        </div>
      </div>
    </div>
  );
};
