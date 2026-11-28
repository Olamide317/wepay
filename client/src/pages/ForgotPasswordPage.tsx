import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { WePayLogo } from '../components/WePayLogo';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/FormControls';
import { AlertBanner } from '../components/ui/StateViews';
import { wepayService } from '../services/wepayService';
import { isValidEmail, suggestEmailCorrection } from '../utils/formatters';
import fundingImage from '../assets/images/funding.jpg';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const emailCorrection = suggestEmailCorrection(email);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setEmailError(undefined);
    setLoading(true);
    try {
      const response = await wepayService.requestPasswordReset(email);
      setSuccess(response.message);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to request a password reset. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex flex-col justify-center px-4 py-10 bg-cover bg-center overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.68), rgba(248, 250, 252, 0.68)), url(${fundingImage})`,
      }}
    >
      <BackButton className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6" />
      <div className="relative w-full max-w-md mx-auto space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <Link to="/" aria-label="Return to WePay Home">
            <WePayLogo size="lg" />
          </Link>
          <h1 className="font-display text-2xl font-bold text-slate-900 pt-2">
            Forgot your password?
          </h1>
          <p className="text-sm text-slate-600">
            Enter your organizer email and we will send a secure reset link if an account exists.
          </p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {error && <AlertBanner variant="error" message={error} />}
            {success && <AlertBanner variant="success" message={success} />}
            <div>
              <Input
                label="Email address"
                type="email"
                required
                autoComplete="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailError(undefined);
                }}
                error={emailError}
              />
              {emailCorrection && (
                <button
                  type="button"
                  className="mt-1.5 text-xs font-medium text-indigo-600 underline hover:text-indigo-700"
                  onClick={() => {
                    setEmail(emailCorrection);
                    setEmailError(undefined);
                  }}
                >
                  Did you mean {emailCorrection}?
                </button>
              )}
            </div>
            <Button type="submit" fullWidth size="lg" loading={loading}>
              {loading ? 'Sending reset link...' : 'Send reset link'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-slate-600">
          Remembered your password?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
