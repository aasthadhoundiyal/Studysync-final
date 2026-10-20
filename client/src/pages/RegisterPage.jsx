import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  LogIn,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import HonorCodeModal from '@/components/common/HonorCodeModal';
import { useAuth } from '@/context/AuthContext';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showHonorModal, setShowHonorModal] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // Real-time password criteria
  const hasMinLength = password.length >= 8 && password.length <= 72;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // Client-side validation logic
  const validateForm = () => {
    const errors = {};
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Username checks
    if (!cleanUsername) {
      errors.username = 'Username is required.';
    } else if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      errors.username = 'Username must be 3 to 30 characters.';
    } else if (!/^[a-z0-9_.]+$/.test(cleanUsername)) {
      errors.username = 'Only lowercase letters, numbers, underscores, and dots allowed.';
    } else if (cleanUsername === 'me') {
      errors.username = 'This username is reserved.';
    }

    // Email checks
    if (!cleanEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      errors.email = 'Please provide a valid student or personal email address.';
    }

    // Password checks
    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      errors.password = 'Password must contain at least one letter and one number.';
    }

    // Confirm password check
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm your password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    // Terms agreement
    if (!agreeTerms) {
      errors.terms = 'You must agree to the Academic Community Guidelines.';
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
      const res = await register({
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (res?.success) {
        setRegisterSuccess(true);
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 800);
      }
    } catch (err) {
      if (err?.details && Array.isArray(err.details)) {
        const mappedErrors = {};
        err.details.forEach((d) => {
          if (d.field) mappedErrors[d.field] = d.message;
        });
        setFieldErrors(mappedErrors);
      }
      setServerError(
        err?.message || 'Registration could not be completed. Please review your details.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Segmented Tabs: Instant Switch Without Scrolling */}
      <div className="grid grid-cols-2 p-1 bg-surface-100/90 rounded-xl border border-surface-200/70 text-xs font-semibold">
        <Link
          to="/login"
          className="py-2 text-center rounded-lg text-surface-600 hover:text-brand-600 hover:bg-white/70 transition-all flex items-center justify-center gap-1.5 group"
        >
          <LogIn className="w-3.5 h-3.5 text-surface-400 group-hover:text-brand-600 transition-colors" />
          <span>Sign In</span>
        </Link>
        <div className="py-2 text-center rounded-lg bg-white text-surface-900 shadow-subtle border border-surface-200/60 flex items-center justify-center gap-1.5">
          <span>New User? Sign Up</span>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-surface-900 tracking-tight">
          Create Student Account
        </h2>
      </div>

      {/* Success Notification */}
      {registerSuccess && (
        <Alert variant="success" title="Account Created Successfully!">
          Welcome to StudySync! Launching your personalized workspace...
        </Alert>
      )}

      {/* Server Error Alert */}
      {serverError && !registerSuccess && (
        <Alert variant="error" title="Registration Error">
          {serverError}
        </Alert>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {/* Username */}
        <Input
          label="Username"
          type="text"
          name="username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            if (fieldErrors.username) {
              setFieldErrors((prev) => ({ ...prev, username: undefined }));
            }
          }}
          placeholder="e.g. alex_scholar"
          helperText="3-30 characters: letters, numbers, underscores, and dots"
          error={fieldErrors.username}
          disabled={isLoading || registerSuccess}
          leftIcon={<User className="w-4 h-4" />}
          autoComplete="username"
          autoFocus
          required
        />

        {/* Email */}
        <Input
          label="Student Email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) {
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }
          }}
          placeholder="alex@university.edu"
          error={fieldErrors.email}
          disabled={isLoading || registerSuccess}
          leftIcon={<Mail className="w-4 h-4" />}
          autoComplete="email"
          required
        />

        {/* Password */}
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
          placeholder="At least 8 characters"
          error={fieldErrors.password}
          disabled={isLoading || registerSuccess}
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
          autoComplete="new-password"
          required
        />

        {/* Real-time Password Rules Checklist */}
        <div className="grid grid-cols-2 gap-1.5 px-1 text-[11px] text-surface-500">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                hasMinLength
                  ? 'bg-emerald-100 text-emerald-700 font-bold'
                  : 'bg-surface-200 text-surface-400'
              }`}
            >
              ✓
            </span>
            <span className={hasMinLength ? 'text-emerald-700 font-medium' : ''}>
              8-72 characters
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                hasLetter && hasNumber
                  ? 'bg-emerald-100 text-emerald-700 font-bold'
                  : 'bg-surface-200 text-surface-400'
              }`}
            >
              ✓
            </span>
            <span className={hasLetter && hasNumber ? 'text-emerald-700 font-medium' : ''}>
              Letter &amp; number
            </span>
          </div>
        </div>

        {/* Confirm Password */}
        <Input
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          name="confirmPassword"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (fieldErrors.confirmPassword) {
              setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }
          }}
          placeholder="Re-enter your password"
          error={fieldErrors.confirmPassword}
          disabled={isLoading || registerSuccess}
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="text-surface-400 hover:text-surface-700 p-1 focus:outline-none"
              title={showConfirmPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          }
          autoComplete="new-password"
          required
        />

        {/* Agreement Checkbox */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => {
                setAgreeTerms(e.target.checked);
                if (fieldErrors.terms) {
                  setFieldErrors((prev) => ({ ...prev, terms: undefined }));
                }
              }}
              className="mt-0.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-surface-600 leading-normal">
              I agree to the StudySync{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowHonorModal(true);
                }}
                className="text-brand-600 font-medium underline hover:text-brand-700 cursor-pointer focus:outline-none"
              >
                Academic Honor Code
              </button>{' '}
              and community guidelines.
            </span>
          </label>
          {fieldErrors.terms && (
            <p className="text-xs text-rose-600 mt-1 ml-6">{fieldErrors.terms}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-1.5 py-2.5 font-semibold shadow-sm"
          isLoading={isLoading}
          disabled={isLoading || registerSuccess}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          {isLoading ? 'Creating Account...' : 'Complete Registration'}
        </Button>
      </form>

      {/* Switch to Login */}
      <div className="pt-3 border-t border-surface-100 text-center text-xs text-surface-500">
        Already have a student account?{' '}
        <Link
          to="/login"
          className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
        >
          Sign In
        </Link>
      </div>

      {/* Academic Honor Code Modal */}
      <HonorCodeModal
        isOpen={showHonorModal}
        onClose={() => setShowHonorModal(false)}
        onAccept={() => {
          setAgreeTerms(true);
          if (fieldErrors.terms) {
            setFieldErrors((prev) => ({ ...prev, terms: undefined }));
          }
        }}
      />
    </div>
  );
}

export default RegisterPage;
