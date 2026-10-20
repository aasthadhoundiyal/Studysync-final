import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  UserPlus,
  GraduationCap,
  Shield,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import { useAuth } from '@/context/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Quick fill helper for demo student credentials
  const fillDemoStudent = () => {
    setIdentifier('student');
    setPassword('Student@12345');
    setFieldErrors({});
    setServerError(null);
  };

  // Quick fill helper for demo admin credentials
  const fillDemoAdmin = () => {
    setIdentifier('admin');
    setPassword('Admin@12345');
    setFieldErrors({});
    setServerError(null);
  };

  // Client-side validation
  const validateForm = () => {
    const errors = {};
    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier) {
      errors.identifier = 'Email or username is required.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await login({
        identifier: identifier.trim(),
        password,
      });

      if (res?.success) {
        setLoginSuccess(true);
        const destination = location.state?.from?.pathname || '/';
        setTimeout(() => {
          navigate(destination, { replace: true });
        }, 500);
      }
    } catch (err) {
      if (err?.details && Array.isArray(err.details)) {
        const mappedErrors = {};
        err.details.forEach((d) => {
          if (d.field) mappedErrors[d.field] = d.message;
        });
        setFieldErrors(mappedErrors);
      }
      setServerError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Segmented Tabs: Instant Switch Without Scrolling */}
      <div className="grid grid-cols-2 p-1 bg-surface-100/90 rounded-xl border border-surface-200/70 text-xs font-semibold">
        <div className="py-2 text-center rounded-lg bg-white text-surface-900 shadow-subtle border border-surface-200/60 flex items-center justify-center gap-1.5">
          <span>Sign In</span>
        </div>
        <Link
          to="/register"
          className="py-2 text-center rounded-lg text-surface-600 hover:text-brand-600 hover:bg-white/70 transition-all flex items-center justify-center gap-1.5 group"
        >
          <UserPlus className="w-3.5 h-3.5 text-surface-400 group-hover:text-brand-600 transition-colors" />
          <span>New User? Sign Up</span>
          <ArrowRight className="w-3 h-3 text-surface-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      <div>
        <h2 className="text-lg font-bold text-surface-900 tracking-tight">
          Sign In to StudySync
        </h2>
      </div>

      {/* Demo Credentials Quick Fill Banner */}
      <div className="px-3 py-2 rounded-xl bg-surface-100/90 border border-surface-200/80 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 min-w-0 text-surface-700 font-medium">
          <KeyRound className="w-3.5 h-3.5 text-brand-600 shrink-0" />
          <span className="text-[11px] text-surface-600 font-medium">Auto-fill Demo:</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={fillDemoStudent}
            title="Auto-fill Demo Student: student / Student@12345"
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-200/90 px-2.5 py-1 rounded-lg transition-colors shadow-subtle flex items-center gap-1"
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Student</span>
          </button>
          <button
            type="button"
            onClick={fillDemoAdmin}
            title="Auto-fill Demo Admin: admin / Admin@12345"
            className="text-[11px] font-semibold text-brand-700 hover:text-brand-800 bg-white hover:bg-brand-50 border border-brand-200/90 px-2.5 py-1 rounded-lg transition-colors shadow-subtle flex items-center gap-1"
          >
            <Shield className="w-3.5 h-3.5 text-brand-600" />
            <span>Admin</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {loginSuccess && (
        <Alert variant="success" title="Authentication Successful">
          Welcome back! Redirecting you to your study workspace...
        </Alert>
      )}

      {/* Server Error Alert */}
      {serverError && !loginSuccess && (
        <Alert variant="error" title="Sign In Error">
          {serverError}
        </Alert>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
        {/* Identifier (Email or Username) */}
        <Input
          label="Email or Username"
          type="text"
          name="identifier"
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            if (fieldErrors.identifier) {
              setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
            }
          }}
          placeholder="e.g. admin or alex@univ.edu"
          error={fieldErrors.identifier}
          disabled={isLoading || loginSuccess}
          leftIcon={<Mail className="w-4 h-4" />}
          autoComplete="username"
          autoFocus
          required
        />

        {/* Password with Visibility Toggle */}
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password) {
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }
          }}
          placeholder="••••••••"
          error={fieldErrors.password}
          disabled={isLoading || loginSuccess}
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-surface-400 hover:text-surface-700 p-1 focus:outline-none"
              title={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          }
          autoComplete="current-password"
          required
        />

        <div className="flex items-center justify-between text-xs pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer text-surface-600">
            <input
              type="checkbox"
              defaultChecked
              className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
            />
            <span>Keep me signed in</span>
          </label>
          <span className="text-brand-600 hover:text-brand-700 cursor-pointer text-[11px] font-medium">
            Forgot password?
          </span>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-1.5 py-2.5 font-semibold shadow-sm"
          isLoading={isLoading}
          disabled={isLoading || loginSuccess}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>

      {/* Switch to Register */}
      <div className="pt-3 border-t border-surface-100 text-center text-xs text-surface-500">
        Don&apos;t have a StudySync account?{' '}
        <Link
          to="/register"
          className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
        >
          Create student account
        </Link>
      </div>
    </div>
  );
}

export default LoginPage;
