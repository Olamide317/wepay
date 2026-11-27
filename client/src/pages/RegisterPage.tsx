import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { WePayLogo } from '../components/WePayLogo';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Checkbox, Input } from '../components/ui/FormControls';
import { AlertBanner } from '../components/ui/StateViews';
import { useAuth } from '../context/AuthContext';
import { formatDisplayName, isValidEmail, isValidNigerianPhone, slugify } from '../utils/formatters';

interface RegisterErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  handle?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [errors, setErrors] = useState<RegisterErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: RegisterErrors = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      next.fullName = 'Please enter your full name.';
    }
    if (!email.trim() || !isValidEmail(email)) {
      next.email = 'Please enter a valid email address.';
    }
    if (!phone.trim() || !isValidNigerianPhone(phone)) {
      next.phone = 'Enter a valid Nigerian phone number (e.g. 0803 123 4567 or +2348031234567).';
    }
    const cleanHandle = slugify(handle);
    if (!cleanHandle || cleanHandle.length < 3) {
      next.handle = 'Handle must be at least 3 letters or numbers.';
    }
    if (!password || password.length < 6) {
      next.password = 'Password must be at least 6 characters.';
    }
    if (confirmPassword !== password) {
      next.confirmPassword = 'Passwords do not match.';
    }
    if (!termsAccepted) {
      next.terms = 'You must accept the WePay terms to create an account.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        fullName: formatDisplayName(fullName),
        email,
        phone,
        handle: slugify(handle),
        password,
      });
      navigate('/dashboard');
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to create account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-10">
      <div className="w-full max-w-lg mx-auto space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <Link to="/" aria-label="Return to WePay Home">
            <WePayLogo size="lg" />
          </Link>
          <h1 className="font-display text-2xl font-bold text-slate-900 pt-2">
            Create your WePay organizer account
          </h1>
          <p className="text-sm text-slate-600">
            Launch bill splits, dues collections, or pre-order storefronts in minutes.
          </p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {submitError && <AlertBanner variant="error" message={submitError} />}

            <Input
              label="Full name"
              required
              autoComplete="name"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={errors.fullName}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Email address"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
              />
              <Input
                label="Phone number"
                type="tel"
                required
                autoComplete="tel"
                placeholder="0800 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={errors.phone}
              />
            </div>

            <Input
              label="Organizer handle"
              required
              placeholder="your-handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ''))}
              hint={`Your public collection hub: /u/${slugify(handle) || 'your-handle'}`}
              error={errors.handle}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                rightAddon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
              <Input
                label="Confirm password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
              />
            </div>

            <div className="pt-1">
              <Checkbox
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                error={errors.terms}
                label={
                  <span>
                    I agree to WePay&apos;s Terms of Service and confirm that collections comply
                    with Nigerian financial guidelines.
                  </span>
                }
              />
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
