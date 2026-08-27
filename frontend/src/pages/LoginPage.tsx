import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Mail } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { api, ApiError } from '@/lib/api';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassModal } from '@/components/ui/GlassModal';
import { toast } from '@/components/ui/toast/useToastStore';

export default function LoginPage() {
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            toast.success('Welcome back!', 'You have been signed in successfully.');
            const state = useAuthStore.getState();
            const isHr = state.user?.roles?.some(r => r.toLowerCase().includes('hr'));
            navigate(isHr ? '/app/hr' : '/app');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed';
            toast.danger('Sign-in failed', message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail);
        if (!emailOk) {
            toast.danger('Invalid email', 'Please enter a valid email address.');
            return;
        }
        setForgotLoading(true);
        try {
            await api.post('/api/v1/auth/forgot-password', { email: forgotEmail });
            toast.success('Reset link sent', 'Check your email for password reset instructions.');
            setShowForgot(false);
            setForgotEmail('');
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Failed to send reset link';
            toast.danger('Request failed', message);
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <>
        <div className="flex min-h-screen">
            {/* Branding Panel */}
            <div className="hidden w-[45%] flex-col justify-between bg-gray-950 p-12 lg:flex">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent shadow-lg">
                        <ShieldCheck className="h-6 w-6 text-accent-text" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-white">SecureCode AI</span>
                </div>
                <div className="flex flex-col gap-6">
                    <h1 className="text-4xl font-bold leading-tight text-white">
                        Hire smarter with<br />AI-powered assessments
                    </h1>
                    <p className="max-w-md text-base text-gray-400">
                        Proctored coding tests, automated scoring, and data-driven hiring decisions — all in one platform built for engineering teams.
                    </p>
                    <div className="flex flex-col gap-3">
                        {[
                            'AI-powered proctoring with webcam & tab monitoring',
                            'Automated code evaluation with hidden test cases',
                            'Comprehensive reports with section-wise analytics',
                        ].map((feature) => (
                            <div key={feature} className="flex items-center gap-3">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20">
                                    <ArrowRight className="h-3 w-3 text-accent" />
                                </div>
                                <span className="text-sm text-gray-300">{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="text-xs text-gray-600">
                    &copy; 2026 SecureCode AI. All rights reserved.
                </div>
            </div>

            {/* Form Panel */}
            <div className="flex flex-1 items-center justify-center bg-canvas p-8">
                <div className="w-full max-w-sm">
                    <div className="mb-8">
                        <div className="mb-4 flex items-center gap-2.5 lg:hidden">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent shadow-sm">
                                <ShieldCheck className="h-5 w-5 text-accent-text" />
                            </div>
                            <span className="text-base font-bold tracking-tight text-text-primary">SecureCode AI</span>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-text-primary">Sign in to your account</h2>
                        <p className="mt-1.5 text-sm text-text-secondary">
                            Enter your credentials to access the platform.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} aria-label="Sign in form" className="flex flex-col gap-4">
                        <GlassInput
                            label="Email"
                            type="email"
                            placeholder="you@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <GlassInput
                            label="Password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <GlassButton
                            type="submit"
                            variant="primary"
                            size="lg"
                            isLoading={loading}
                            className="mt-2 w-full"
                        >
                            Sign In
                            <ArrowRight className="h-4 w-4" />
                        </GlassButton>
                    </form>

                    <p className="mt-6 text-center text-sm text-text-secondary">
                        Don't have an account?{' '}
                        <Link to="/register" className="font-semibold text-accent hover:text-accent-hover">
                            Create one
                        </Link>
                    </p>

                    <p className="mt-3 text-center">
                        <button
                            type="button"
                            onClick={() => setShowForgot(true)}
                            className="text-xs font-medium text-text-muted hover:text-accent"
                        >
                            Forgot password?
                        </button>
                    </p>
                </div>
            </div>
        </div>

        {/* Forgot Password Modal */}
        <GlassModal
            open={showForgot}
            onClose={() => setShowForgot(false)}
            title="Reset Password"
        >
            <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-text-secondary">
                    Enter your email. We'll send a password reset link to your email.
                </p>
                <GlassInput
                    label="Email"
                    name="forgotEmail"
                    type="email"
                    placeholder="you@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                />
                <div className="flex justify-end gap-2 pt-2">
                    <GlassButton variant="secondary" size="sm" onClick={() => setShowForgot(false)}>Cancel</GlassButton>
                    <GlassButton variant="primary" size="sm" type="submit" isLoading={forgotLoading}>
                        <Mail className="h-4 w-4" /> Send Reset Link
                    </GlassButton>
                </div>
            </form>
        </GlassModal>
        </>
    );
}
