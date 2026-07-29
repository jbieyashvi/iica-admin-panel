import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthError, DEMO } from '../../services/authService';
import { Button } from '../../components/ui/Button';
import { AuthShell } from './AuthShell';

const LEN = 6;

export function VerifyPage() {
  const { verifyOtp, resendOtp, getPendingEmail, logout } = useAuth();
  const navigate = useNavigate();
  const pendingEmail = getPendingEmail();

  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resent, setResent] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  // No staged login → bounce back.
  if (!pendingEmail) return <Navigate to="/admin/login" replace />;

  const code = digits.join('');

  const setAt = (i: number, val: string) => {
    setDigits((prev) => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  };

  const handleChange = (i: number, raw: string) => {
    const val = raw.replace(/\D/g, '');
    if (!val) {
      setAt(i, '');
      return;
    }
    // Support paste of full code.
    if (val.length > 1) {
      const chars = val.slice(0, LEN).split('');
      setDigits((prev) => {
        const next = [...prev];
        chars.forEach((c, idx) => {
          if (i + idx < LEN) next[i + idx] = c;
        });
        return next;
      });
      const last = Math.min(i + chars.length, LEN - 1);
      inputs.current[last]?.focus();
      return;
    }
    setAt(i, val);
    if (i < LEN - 1) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length !== LEN) {
      setError('Enter all six digits of the verification code.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(code);
      setSuccess(true);
      setTimeout(() => navigate('/admin/dashboard', { replace: true }), 650);
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Verification failed. Please try again.');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResent(false);
    await resendOtp();
    setResent(true);
    setError(null);
  };

  const backToLogin = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <AuthShell
      title="Verify it's you"
      subtitle={`We sent a 6-digit code to ${pendingEmail}.`}
    >
      <form onSubmit={submit} className="space-y-5">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Verified — opening your dashboard…
          </div>
        )}

        <div className="flex justify-between gap-2" role="group" aria-label="Verification code">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              inputMode="numeric"
              maxLength={i === 0 ? LEN : 1}
              aria-label={`Digit ${i + 1}`}
              disabled={loading || success}
              className="h-12 w-full rounded-lg border border-cream-200 bg-white text-center text-lg font-semibold text-charcoal transition focus:border-magenta-500 focus:ring-2 focus:ring-magenta-500/20 disabled:opacity-60"
            />
          ))}
        </div>

        <Button type="submit" size="lg" loading={loading} disabled={success} className="w-full">
          {loading ? 'Verifying…' : 'Verify & continue'}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={backToLogin}
            className="inline-flex items-center gap-1.5 text-charcoal-muted hover:text-charcoal"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to login
          </button>
          <button
            type="button"
            onClick={handleResend}
            className="font-medium text-magenta-600 hover:text-magenta-700"
          >
            Resend code
          </button>
        </div>
        {resent && (
          <p className="text-center text-xs text-emerald-600">
            A new code has been sent. (Demo code is {DEMO.otp}.)
          </p>
        )}
      </form>
    </AuthShell>
  );
}
