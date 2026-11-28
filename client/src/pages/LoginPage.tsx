import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { WePayLogo } from '../components/WePayLogo';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Checkbox, Input } from '../components/ui/FormControls';
import { AlertBanner } from '../components/ui/StateViews';
import { useAuth } from '../context/AuthContext';
import { isValidEmail } from '../utils/formatters';
import fundingImage from '../assets/images/funding.jpg';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [forgotNotice, setForgotNotice] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await login(email, password, rememberMe);
      navigate('/dashboard');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-cover bg-center px-4 py-10"
      style={{ backgroundImage: `url(${fundingImage})` }}
    >
      <div className="absolute inset-0 bg-[#f8fafc]/85" aria-hidden="true" />
      <BackButton className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6" />
      <div className="relative w-full max-w-md mx-auto space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <Link to="/" aria-label="Return to WePay Home">
            <WePayLogo size="lg" />
          </Link>
          <h1 className="font-display text-2xl font-bold text-slate-900 pt-2">
            Sign in to your organizer account
          </h1>
          <p className="text-sm text-slate-600">
            Manage your collections, inspect transactions, and share payment links.
          </p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {authError && <AlertBanner variant="error" message={authError} />}
            {forgotNotice && (
              <AlertBanner
                variant="info"
                message="Password reset is managed by your organizer account administrator. Contact support if you need help recovering access."
              />
            )}

            <Input
              label="Email address"
              type="email"
              required
              autoComplete="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
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

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <Checkbox
                label="Remember me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <button
                type="button"
                onClick={() => setForgotNotice((v) => !v)}
                className="text-xs font-medium text-teal-700 hover:text-teal-800 cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading}>
              <Lock className="h-4 w-4" />
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-slate-600">
          New to WePay?{' '}
          <Link to="/register" className="font-semibold text-teal-700 hover:text-teal-800">
            Create an organizer account
          </Link>
        </p>
      </div>
    </div>
  );
};
