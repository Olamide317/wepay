import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { WePayLogo } from '../components/WePayLogo';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/FormControls';
import { AlertBanner } from '../components/ui/StateViews';
import { wepayService } from '../services/wepayService';
import fundingImage from '../assets/images/funding.jpg';

export const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('Reset link is invalid or has expired.');
      return;
    }

    setLoading(true);
    try {
      await wepayService.resetPassword(token, password);
      navigate('/login', {
        replace: true,
        state: { passwordReset: true },
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to reset your password. Please try again.'
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
            Choose a new password
          </h1>
          <p className="text-sm text-slate-600">
            Your password must be at least 6 characters long.
          </p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {error && <AlertBanner variant="error" message={error} />}
            <Input
              label="New password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="Enter a new password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              rightAddon={
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            <Input
              label="Confirm new password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <Button type="submit" fullWidth size="lg" loading={loading}>
              <Lock className="h-4 w-4" />
              <span>{loading ? 'Updating password...' : 'Reset password'}</span>
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
