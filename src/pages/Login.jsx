import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Phone, Shield, Eye, EyeOff, CheckCircle, Loader } from 'lucide-react';
import axios from 'axios';

export default function Login({ onLoginSuccess }) {
    const [step, setStep] = useState('credentials'); // credentials, mfa, success
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [mfaToken, setMfaToken] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/auth/login', {
                email,
                password
            });

            if (response.data.mfaRequired) {
                setMfaToken(response.data.mfaToken);
                setStep('mfa');
            } else {
                // Direct login (shouldn't happen with MFA enabled)
                localStorage.setItem('sessionToken', response.data.sessionToken);
                onLoginSuccess();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMFAVerification = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/auth/verify-mfa', {
                mfaToken,
                mfaCode
            });

            localStorage.setItem('sessionToken', response.data.sessionToken);
            localStorage.setItem('refreshToken', response.data.refreshToken);

            setStep('success');
            setTimeout(() => {
                onLoginSuccess();
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid MFA code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Shield className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">
                        Chronic Disease<br />Copilot for Patients
                    </h1>
                    <p className="text-slate-600">Secure access to your health data</p>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
                    {step === 'credentials' && (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome Back</h2>
                                <p className="text-slate-600 text-sm">Sign in to access your health profile</p>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="sarah.johnson@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="Enter your password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center">
                                    <input type="checkbox" className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                                    <span className="ml-2 text-sm text-slate-600">Remember me</span>
                                </label>
                                <a href="#" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                                    Forgot password?
                                </a>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader className="animate-spin" size={20} />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </button>

                            <div className="text-center">
                                <p className="text-sm text-slate-600">
                                    Don't have an account?{' '}
                                    <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
                                        Register now
                                    </a>
                                </p>
                            </div>
                        </form>
                    )}

                    {step === 'mfa' && (
                        <form onSubmit={handleMFAVerification} className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">Verify Your Identity</h2>
                                <p className="text-slate-600 text-sm">
                                    We've sent a 6-digit code to your phone ending in ****{email.slice(-4)}
                                </p>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Verification Code
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input
                                        type="text"
                                        value={mfaCode}
                                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center text-2xl tracking-widest font-mono"
                                        placeholder="000000"
                                        maxLength={6}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStep('credentials')}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || mfaCode.length !== 6}
                                    className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader className="animate-spin" size={20} />
                                            Verifying...
                                        </>
                                    ) : (
                                        'Verify'
                                    )}
                                </button>
                            </div>

                            <div className="text-center">
                                <button type="button" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                                    Resend code
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-8">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                            >
                                <CheckCircle className="text-green-600" size={40} />
                            </motion.div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Login Successful!</h2>
                            <p className="text-slate-600">Redirecting to your dashboard...</p>
                        </div>
                    )}
                </div>

                {/* Security Notice */}
                <div className="mt-6 p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-slate-200">
                    <div className="flex items-start gap-3">
                        <Shield className="text-primary-600 flex-shrink-0 mt-0.5" size={20} />
                        <div className="text-sm text-slate-600">
                            <strong className="text-slate-800">HIPAA Compliant & Secure:</strong> Your health data is encrypted with AES-256 and protected by multi-factor authentication.
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
