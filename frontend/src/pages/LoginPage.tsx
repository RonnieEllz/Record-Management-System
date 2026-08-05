import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { resolveSessionUser } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Lock, Mail, AlertCircle, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import maintecLogo from '../assets/maintec-logo.webp';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEmailValid = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);
  const isPasswordValid = password.trim().length >= 6;
  const canSubmit = isEmailValid && isPasswordValid && !isSubmitting;
  const hasError = Boolean(error);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isEmailValid) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!isPasswordValid) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: supabaseData, error: supabaseError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (supabaseError) {
        throw supabaseError;
      }

      const accessToken = supabaseData.session?.access_token;
      if (!accessToken) {
        throw new Error('Supabase did not return an access token for this session.');
      }

      const mappedUser = resolveSessionUser(supabaseData);
      login(accessToken, mappedUser);
    } catch (err: any) {
      const message = err?.message || 'Unable to sign in right now. Please try again.';
      setError(message.includes('Invalid login credentials') ? 'Invalid email or password. Please try again.' : message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <BrandMark showTagline={false} logoSrc={maintecLogo} />
          </div>
        </div>

        <div
          className={`glass-panel p-8 rounded-2xl shadow-2xl shadow-slate-950/40 transition-all duration-300 ${
            hasError ? 'border-rose-500/30 ring-2 ring-rose-500/10' : ''
          }`}
        >
          <div className="overflow-hidden transition-all duration-300 ease-out">
            {error && (
              <div
                className="mb-6 animate-[fadeIn_0.22s_ease-out] rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400 shadow-lg shadow-rose-950/10"
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className={`space-y-5 transition-all duration-200 ${hasError ? 'animate-[shake_0.35s_ease-in-out]' : ''}`}>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-3" />
                <input
                  id="email-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  aria-invalid={Boolean(error && !isEmailValid)}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="name@workshop.com"
                  className={`w-full rounded-lg border py-3 pl-11 pr-4 text-sm shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                    hasError
                      ? 'border-rose-400/60 bg-rose-950/20 text-rose-100 placeholder:text-rose-300/50 focus:border-rose-400 focus:ring-rose-500/20'
                      : 'border-slate-700 bg-slate-900/80 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-3" />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  aria-invalid={Boolean(error && !isPasswordValid)}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="••••••••"
                  className={`w-full rounded-lg border py-3 pl-11 pr-11 text-sm shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                    hasError
                      ? 'border-rose-400/60 bg-rose-950/20 text-rose-100 placeholder:text-rose-300/50 focus:border-rose-400 focus:ring-rose-500/20'
                      : 'border-slate-700 bg-slate-900/80 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={!canSubmit}
              className={`glass-button w-full mt-2 transition-all duration-200 ${hasError ? 'scale-[0.99] ring-2 ring-rose-500/15' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to System</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
};
