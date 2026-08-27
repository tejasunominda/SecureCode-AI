import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Check } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { toast } from '@/components/ui/toast/useToastStore';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') ?? '';
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) {
            toast.danger('Passwords do not match');
            return;
        }
        if (password.length < 8) {
            toast.danger('Password must be at least 8 characters');
            return;
        }
        if (!token) {
            toast.danger('Invalid or missing reset token');
            return;
        }
        setLoading(true);
        try {
            await api.post('/api/v1/auth/reset-password', { token, newPassword: password });
            toast.success('Password reset', 'You can now log in with your new password.');
            navigate('/login');
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Failed to reset password';
            toast.danger('Reset failed', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
            <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-lg">
                <div className="mb-6 flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent shadow-sm">
                        <ShieldCheck className="h-6 w-6 text-accent-text" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-text-primary">SecureCode AI</span>
                </div>
                <h1 className="mb-1 text-2xl font-bold text-text-primary">Reset password</h1>
                <p className="mb-6 text-sm text-text-secondary">Enter a new password for your account.</p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <GlassInput
                        label="New password"
                        type="password"
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <GlassInput
                        label="Confirm password"
                        type="password"
                        placeholder="Re-enter the password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                    />
                    <ul className="space-y-1 text-xs text-text-muted">
                        <li className={password.length >= 8 ? 'text-success' : ''}><Check className="inline h-3 w-3" /> At least 8 characters</li>
                        <li className={/[A-Z]/.test(password) ? 'text-success' : ''}><Check className="inline h-3 w-3" /> One uppercase letter</li>
                        <li className={/[a-z]/.test(password) ? 'text-success' : ''}><Check className="inline h-3 w-3" /> One lowercase letter</li>
                        <li className={/\d/.test(password) ? 'text-success' : ''}><Check className="inline h-3 w-3" /> One digit</li>
                        <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password) ? 'text-success' : ''}><Check className="inline h-3 w-3" /> One special character</li>
                    </ul>
                    <GlassButton type="submit" variant="primary" size="lg" isLoading={loading}>
                        Reset password
                    </GlassButton>
                </form>
            </div>
        </div>
    );
}
