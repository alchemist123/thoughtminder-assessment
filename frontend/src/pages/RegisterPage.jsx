import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FullPageSpinner } from '@/components/ui/LoadingSpinner';
import api from '@/lib/axios';

const STREAMS = ['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'MCA', 'MBA', 'Other'];

const INITIAL_FORM = {
  name: '',
  email: '',
  password: '',
  stream: '',
  sgpa: '',
  interested_area: '',
  batch: '',
};

function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-destructive">{error}</p>;
}

function validate(form) {
  const errs = {};
  if (!form.name.trim()) errs.name = 'Full name is required.';
  if (!form.email.trim()) errs.email = 'Email is required.';
  if (!form.password) {
    errs.password = 'Password is required.';
  } else if (form.password.length < 8) {
    errs.password = 'Password must be at least 8 characters.';
  }
  if (!form.stream) errs.stream = 'Stream is required.';
  if (!form.sgpa) {
    errs.sgpa = 'SGPA is required.';
  } else {
    const v = parseFloat(form.sgpa);
    if (Number.isNaN(v) || v < 0 || v > 10) errs.sgpa = 'SGPA must be between 0 and 10.';
  }
  if (!form.interested_area.trim()) errs.interested_area = 'Interested area is required.';
  if (!form.batch.trim()) errs.batch = 'Batch is required.';
  return errs;
}

export function RegisterPage() {
  const { token } = useParams();

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api
      .get(`/register/validate/${token}`)
      .then(() => setTokenValid(true))
      .catch((err) => {
        setTokenError(
          err.response?.data?.message ??
            'This registration link is invalid or has expired.'
        );
      })
      .finally(() => setValidating(false));
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const handleStreamChange = (value) => {
    setForm((f) => ({ ...f, stream: value }));
    setErrors((e) => ({ ...e, stream: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      await api.post(`/register/${token}`, {
        ...form,
        sgpa: parseFloat(form.sgpa),
      });
      setSuccess(true);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (Array.isArray(apiErrors)) {
        const mapped = {};
        apiErrors.forEach(({ field, message }) => {
          mapped[field] = message;
        });
        setErrors(mapped);
      } else {
        setErrors({
          form: err.response?.data?.message ?? 'Registration failed. Please try again.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) return <FullPageSpinner />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {!tokenValid ? (
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-8 pb-6">
            <p className="text-4xl">🔗</p>
            <p className="mt-3 text-lg font-semibold">Link invalid or expired</p>
            <p className="mt-2 text-sm text-muted-foreground">{tokenError}</p>
          </CardContent>
        </Card>
      ) : success ? (
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-8 pb-6">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
            <p className="mt-4 text-lg font-semibold">Registration successful!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your account has been created. You can now log in.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to="/login">Go to login</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <p className="text-sm text-muted-foreground">
              Fill in your details to complete registration.
            </p>
          </CardHeader>
          <CardContent>
            {errors.form && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {errors.form}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Full Name */}
              <div>
                <label htmlFor="name" className="text-sm font-medium">
                  Full name
                </label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Your name"
                  value={form.name}
                  onChange={handleChange}
                  className="mt-1"
                  autoFocus
                />
                <FieldError error={errors.name} />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  className="mt-1"
                />
                <FieldError error={errors.email} />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={handleChange}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4" />
                      : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <FieldError error={errors.password} />
              </div>

              {/* Stream */}
              <div>
                <label className="text-sm font-medium">Stream</label>
                <Select value={form.stream} onValueChange={handleStreamChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select your stream" />
                  </SelectTrigger>
                  <SelectContent>
                    {STREAMS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError error={errors.stream} />
              </div>

              {/* SGPA + Batch */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sgpa" className="text-sm font-medium">
                    SGPA
                  </label>
                  <Input
                    id="sgpa"
                    name="sgpa"
                    type="number"
                    placeholder="0.00 – 10.00"
                    value={form.sgpa}
                    onChange={handleChange}
                    min="0"
                    max="10"
                    step="0.01"
                    className="mt-1"
                  />
                  <FieldError error={errors.sgpa} />
                </div>
                <div>
                  <label htmlFor="batch" className="text-sm font-medium">
                    Batch
                  </label>
                  <Input
                    id="batch"
                    name="batch"
                    placeholder="e.g. 2025"
                    value={form.batch}
                    onChange={handleChange}
                    className="mt-1"
                  />
                  <FieldError error={errors.batch} />
                </div>
              </div>

              {/* Interested Area */}
              <div>
                <label htmlFor="interested_area" className="text-sm font-medium">
                  Interested area
                </label>
                <Input
                  id="interested_area"
                  name="interested_area"
                  placeholder="e.g. Software Development, Data Science"
                  value={form.interested_area}
                  onChange={handleChange}
                  className="mt-1"
                />
                <FieldError error={errors.interested_area} />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Creating account…' : 'Register'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
