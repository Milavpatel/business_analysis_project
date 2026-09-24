import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Mail, Lock, User, Eye, EyeOff,
  ArrowRight, Loader2, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Animated Background Orbs ─────────────────────────────────────────────────
const BackgroundOrbs = () => null;

// ─── Input Field ──────────────────────────────────────────────────────────────
const AuthInput = ({ icon: Icon, label, type = 'text', value, onChange, placeholder, rightElement }) => (
  <div className="group flex flex-col gap-1.5">
    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider pl-0.5">
      {label}
    </label>
    <div className="relative flex items-center">
      <div className="absolute left-3.5 text-gray-400 group-focus-within:text-primary transition-colors duration-150">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-white border border-gray-300 rounded-none pl-10 pr-11 py-2.5 text-gray-900 placeholder-gray-400 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/10 transition-all duration-150"
      />
      {rightElement && (
        <div className="absolute right-3.5">{rightElement}</div>
      )}
    </div>
  </div>
);

// ─── Alert Banner ─────────────────────────────────────────────────────────────
const AlertBanner = ({ type, message }) => {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-none border text-xs ${
        isError
          ? 'bg-rose-50 border-rose-200 text-rose-800'
          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
      }`}
    >
      {isError
        ? <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
        : <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />}
      {message}
    </motion.div>
  );
};

// ─── Auth Page ────────────────────────────────────────────────────────────────
const AuthPage = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
    setName('');
    setEmail('');
    setPassword('');
  };

  const validate = () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (password.length < 1) {
      setError('Password is required.');
      return false;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Full name is required.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        setSuccess('Welcome back! Redirecting...');
      } else {
        await register(name, email, password);
        setSuccess('Account created! Redirecting...');
      }
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative">
      <BackgroundOrbs />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo / Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-none bg-primary mb-3 shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-serif uppercase">
            Nexus <span className="font-light text-primary">AI</span>
          </h1>
          <p className="text-gray-500 text-xs mt-1 font-serif italic">Business Intelligence & Growth Encyclopedia</p>
        </div>

        {/* Form Panel */}
        <div className="bg-white border border-gray-200 shadow-md rounded-none overflow-hidden">

          {/* Mode Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            {['login', 'signup'].map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                  mode === m
                    ? 'text-gray-900 border-b-[3px] border-primary bg-white'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                onSubmit={handleSubmit}
                className="flex flex-col gap-4"
              >
                {/* Alert */}
                <AnimatePresence>
                  <AlertBanner type="error" message={error} />
                  <AlertBanner type="success" message={success} />
                </AnimatePresence>

                {/* Name field — signup only */}
                {mode === 'signup' && (
                  <AuthInput
                    icon={User}
                    label="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Smith"
                  />
                )}

                {/* Email */}
                <AuthInput
                  icon={Mail}
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />

                {/* Password */}
                <AuthInput
                  icon={Lock}
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Choose a password' : '••••••••'}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-none bg-primary text-white font-bold text-xs tracking-wider transition-all hover:bg-secondary active:scale-[0.98] shadow-sm"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      {mode === 'login' ? 'Sign In to Dashboard' : 'Create Account'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                {/* Switch mode hint */}
                <p className="text-center text-xs text-gray-500 mt-1">
                  {mode === 'login' ? (
                    <>Don&apos;t have an account?{' '}
                      <button type="button" onClick={() => switchMode('signup')} className="text-primary hover:text-secondary font-bold transition-colors">
                        Sign up free
                      </button>
                    </>
                  ) : (
                    <>Already have an account?{' '}
                      <button type="button" onClick={() => switchMode('login')} className="text-primary hover:text-secondary font-bold transition-colors">
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </motion.form>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[10px] text-gray-600 mt-6 font-medium">
          Your data is encrypted and never shared.
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
