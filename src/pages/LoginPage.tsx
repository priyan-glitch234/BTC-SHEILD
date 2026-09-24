import React, { useState } from 'react';
import {
  ShieldAlert,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  X
} from 'lucide-react';
import { authService, getFriendlyAuthErrorMessage } from '../services/authService.js';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email format (e.g. analyst@btc-shield.internal).');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }
    if (isSignUp && password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoadingEmail(true);

    try {
      if (isSignUp) {
        await authService.registerWithEmail(trimmedEmail, password);
        setSuccessMessage('Account created successfully! Redirecting...');
      } else {
        await authService.loginWithEmail(trimmedEmail, password);
        setSuccessMessage('Authentication successful! Redirecting...');
      }

      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error('Email authentication error:', err);
      setErrorMessage(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoadingGoogle(true);

    try {
      await authService.loginWithGoogle();
      setSuccessMessage('Google authentication verified! Redirecting...');
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error('Google authentication error:', err);
      setErrorMessage(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050507] text-slate-200 flex flex-col justify-between items-center p-4 sm:p-6 font-sans relative overflow-hidden selection:bg-emerald-500 selection:text-black">
      {/* Dynamic Cyber Grid & Radial Glow Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[540px] h-96 sm:h-[540px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Tag */}
      <header className="w-full max-w-5xl flex items-center justify-between py-2 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="font-mono font-bold tracking-tight text-emerald-400 text-sm sm:text-base">
            BTC-SHIELD
          </span>
          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-semibold tracking-wider hidden sm:inline-block">
            Authentication Gateway
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>System Secure</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-md my-auto z-10 animate-in fade-in zoom-in-95 duration-300">
        <div 
          id="login-card"
          className="rounded-md bg-[#111821] border border-[#1D2836] p-6 sm:p-8 shadow-2xl space-y-5 font-sans"
        >
          {/* Card Title & Branding */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-2.5 rounded-md bg-[#17212D] border border-[#2A3A4D] text-sky-400 mb-1">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold font-mono tracking-tight text-slate-100 uppercase">
              {isSignUp ? 'Create Analyst Account' : 'Analyst Authentication'}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              {isSignUp
                ? 'Register credentials for BTC-SHIELD intelligence portal'
                : 'Enter your credentials to access live Bitcoin intelligence'}
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div 
              id="auth-error-banner"
              className="p-3.5 rounded-md bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-start justify-between gap-2.5 animate-in fade-in duration-200"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="p-0.5 text-rose-400 hover:text-rose-200 transition-colors cursor-pointer"
                title="Dismiss message"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div 
              id="auth-success-banner"
              className="p-3.5 rounded-md bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-start justify-between gap-2.5 animate-in fade-in duration-200"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{successMessage}</div>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="p-0.5 text-emerald-400 hover:text-emerald-200 transition-colors cursor-pointer"
                title="Dismiss message"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loadingGoogle || loadingEmail}
            id="btn-google-login"
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-md bg-[#0E141C] hover:bg-slate-800 border border-[#2A3A4D] hover:border-slate-600 text-slate-200 text-xs font-bold font-mono transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50 active:scale-[0.99]"
          >
            {loadingGoogle ? (
              <>
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                {/* Official Google SVG Icon */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500">
              or use email
            </span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4 font-mono text-xs">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 text-[11px] font-bold">
                Analyst Email
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  disabled={loadingEmail || loadingGoogle}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@btc-shield.internal"
                  className="w-full pl-9 pr-3 py-2.5 rounded-md bg-[#0E141C] border border-[#2A3A4D] text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-slate-300 text-[11px] font-bold">
                  Password
                </label>
                {isSignUp && (
                  <span className="text-[10px] text-slate-500">Min 6 chars</span>
                )}
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  disabled={loadingEmail || loadingGoogle}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-md bg-[#0E141C] border border-[#2A3A4D] text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loadingEmail || loadingGoogle}
              id="btn-email-submit"
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono transition-all duration-200 shadow-[0_0_20px_rgba(16,185,129,0.25)] cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              {loadingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isSignUp ? 'Creating Account...' : 'Authenticating...'}</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between Sign In and Sign Up */}
          <div className="pt-2 text-center border-t border-[#1D2836]/80">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              id="btn-toggle-auth-mode"
              className="text-[11px] font-mono text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              {isSignUp ? (
                <span>Already have an analyst account? <strong className="text-emerald-400">Sign In</strong></span>
              ) : (
                <span>New to BTC-SHIELD? <strong className="text-emerald-400">Create Account</strong></span>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Footer Security Badge */}
      <footer className="w-full max-w-5xl py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-slate-500 z-10">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80" />
          <span>Zero-Knowledge Pipeline • End-to-End Cryptographic Access</span>
        </div>
        <div>
          BTC-SHIELD Architecture • Problem Statement 26146
        </div>
      </footer>
    </div>
  );
};
