import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, ExternalLink, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { PancakePilotLogo } from '../components/BrandMark';
import { useFinance } from '../context/FinanceContext';
import { loginSchema, signupSchema } from '../shared/schemas';

export function SignupPage() {
  const navigate = useNavigate();
  const { enterDemoMode, enterGuestMode } = useFinance();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    emailSent: boolean;
    deliveryMessage: string;
    devVerificationUrl?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    const parsed = signupSchema.safeParse({ fullName, email, termsAccepted });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please check your details.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to create account.');
        return;
      }
      setResult({
        emailSent: Boolean(data.emailSent),
        deliveryMessage: data.deliveryMessage,
        devVerificationUrl: data.devVerificationUrl,
      });
    } catch {
      setError('Network error — unable to reach authentication server. You can continue offline in Guest Mode.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] dark:bg-[#080B16] flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-[#9BA6C0] hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <PancakePilotLogo size={26} />
            <span className="font-display font-bold text-sm">PancakePilot</span>
          </div>
        </div>

        <div className="p-7 rounded-3xl pp-surface shadow-xl space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-display font-bold">Create Your Account</h1>
            <p className="text-sm text-slate-600 dark:text-[#9BA6C0]">
              Enable cross-device cloud sync with passwordless magic-link authentication.
            </p>
          </div>

          {result ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#101426] border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {result.emailSent ? (
                    <CheckCircle2 className="w-4 h-4 text-[#40D99A]" />
                  ) : (
                    <Mail className="w-4 h-4 text-[#43D9E8]" />
                  )}
                  <span>
                    {result.emailSent ? 'Verification Email Sent' : 'Development Verification Ready'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-[#9BA6C0] leading-relaxed">
                  {result.deliveryMessage}
                </p>
                {result.devVerificationUrl && (
                  <div className="pt-2">
                    <Link
                      to={result.devVerificationUrl.replace(/^https?:\/\/[^/]+/, '')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold"
                    >
                      Verify Email &amp; Sign In Now
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-xs text-[#A46BFF] hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#9BA6C0] mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-[#A46BFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#9BA6C0] mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-[#A46BFF]"
                />
              </div>

              <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-[#9BA6C0] cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#8156F8] focus:ring-[#A46BFF]"
                />
                <span>
                  I agree to the PancakePilot AI Terms of Service and Privacy Policy (offline-first storage, zero bank credential requests).
                </span>
              </label>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold tracking-wide transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                CREATE MY ACCOUNT
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-[#9BA6C0]">
            <Link to="/login" className="text-[#8156F8] dark:text-[#A46BFF] font-medium hover:underline">
              Already have an account? Sign In
            </Link>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  await enterGuestMode();
                  navigate('/app');
                }}
                className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Continue as Guest
              </button>
              <button
                type="button"
                onClick={async () => {
                  await enterDemoMode();
                  navigate('/app');
                }}
                className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Explore Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { enterDemoMode, enterGuestMode } = useFinance();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    emailSent: boolean;
    deliveryMessage: string;
    devVerificationUrl?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    const parsed = loginSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to send magic link.');
        return;
      }
      setResult({
        emailSent: Boolean(data.emailSent),
        deliveryMessage: data.deliveryMessage,
        devVerificationUrl: data.devVerificationUrl,
      });
    } catch {
      setError('Network error — server unreachable. Continue in offline Guest Mode anytime.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] dark:bg-[#080B16] flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-[#9BA6C0] hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <PancakePilotLogo size={26} />
            <span className="font-display font-bold text-sm">PancakePilot</span>
          </div>
        </div>

        <div className="p-7 rounded-3xl pp-surface shadow-xl space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-display font-bold">Welcome Back</h1>
            <p className="text-sm text-slate-600 dark:text-[#9BA6C0]">
              Enter your registered email to receive a single-use magic login link.
            </p>
          </div>

          {result ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#101426] border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {result.emailSent ? (
                    <CheckCircle2 className="w-4 h-4 text-[#40D99A]" />
                  ) : (
                    <Mail className="w-4 h-4 text-[#43D9E8]" />
                  )}
                  <span>{result.emailSent ? 'Magic Link Dispatched' : 'Dev Magic Link Preview'}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-[#9BA6C0] leading-relaxed">
                  {result.deliveryMessage}
                </p>
                {result.devVerificationUrl && (
                  <div className="pt-2">
                    <Link
                      to={result.devVerificationUrl.replace(/^https?:\/\/[^/]+/, '')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold"
                    >
                      Open Magic Link
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-xs text-[#A46BFF] hover:underline"
              >
                Try another email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#9BA6C0] mb-1.5">
                  Registered email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-[#A46BFF]"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold tracking-wide transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                SEND SECURE LOGIN LINK
              </button>
            </form>
          )}

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={async () => {
                await enterGuestMode();
                navigate('/app');
              }}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.05] text-xs font-medium cursor-pointer"
            >
              Continue as Guest
            </button>
            <button
              type="button"
              onClick={async () => {
                await enterDemoMode();
                navigate('/app');
              }}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.05] text-xs font-medium cursor-pointer"
            >
              Explore Demo
            </button>
          </div>

          <p className="text-center text-xs text-slate-500 dark:text-[#9BA6C0]">
            New here?{' '}
            <Link to="/signup" className="text-[#8156F8] dark:text-[#A46BFF] font-medium hover:underline">
              Create an Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function AuthVerifyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { completeAuthenticatedLogin } = useFinance();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your single-use magic link…');

  useEffect(() => {
    const token = params.get('token') || '';
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    let active = true;
    async function verify() {
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (active) {
            setStatus('error');
            setMessage(data.error || 'Verification failed.');
          }
          return;
        }
        await completeAuthenticatedLogin(data.user, data.sessionToken);
        if (active) {
          setStatus('success');
          setMessage('Verified! Opening your PancakePilot workspace…');
          setTimeout(() => navigate('/app', { replace: true }), 900);
        }
      } catch {
        if (active) {
          setStatus('error');
          setMessage('Network error verifying link.');
        }
      }
    }
    verify();
    return () => {
      active = false;
    };
  }, [completeAuthenticatedLogin, navigate, params]);

  return (
    <div className="min-h-screen bg-[#F6F8FC] dark:bg-[#080B16] flex items-center justify-center p-6">
      <div className="w-full max-w-md p-8 rounded-3xl pp-surface text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-[#8156F8]/15 flex items-center justify-center text-[#A46BFF]">
          {status === 'verifying' ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : status === 'success' ? (
            <ShieldCheck className="w-6 h-6 text-[#40D99A]" />
          ) : (
            <AlertCircle className="w-6 h-6 text-rose-500" />
          )}
        </div>
        <h1 className="text-xl font-display font-bold">
          {status === 'verifying'
            ? 'Verifying Magic Link'
            : status === 'success'
            ? 'Session Established'
            : 'Verification Failed'}
        </h1>
        <p className="text-sm text-slate-600 dark:text-[#9BA6C0]">{message}</p>
        {status === 'error' && (
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl bg-[#8156F8] text-white text-xs font-semibold"
            >
              Request New Link
            </Link>
            <Link
              to="/app"
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium"
            >
              Continue Offline
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
