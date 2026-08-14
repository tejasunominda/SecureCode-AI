import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassSelect } from '@/components/ui/GlassSelect';
import { toast } from '@/components/ui/toast/useToastStore';

export default function RegisterPage() {
    const navigate = useNavigate();
    const register = useAuthStore((s) => s.register);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [orgName, setOrgName] = useState('');
    const [role, setRole] = useState('HR');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await register(email, password, orgName, role);
            toast.success('Account created!', 'Welcome to SecureCode AI.');
            navigate('/app');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Registration failed';
            toast.danger('Registration failed', message);
        } finally {
            setLoading(false);
        }
    };

    return (
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
                        Start hiring better<br />engineers today
                    </h1>
                    <p className="max-w-md text-base text-gray-400">
                        Create your organization and start running proctored coding assessments in minutes. No setup fees, no credit card required.
                    </p>
                    <div className="flex flex-col gap-3">
                        {[
                            'Free 14-day trial with full features',
                            'Unlimited candidates and assessments',
                            'Detailed analytics and hiring reports',
                        ].map((feature) => (
                            <div key={feature} className="flex items-center gap-3">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/20">
                                    <Check className="h-3 w-3 text-success" />
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
                        <h2 className="text-2xl font-bold tracking-tight text-text-primary">Create your account</h2>
                        <p className="mt-1.5 text-sm text-text-secondary">
                            Get started with SecureCode AI in minutes.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <GlassInput
                            label="Organization Name"
                            placeholder="Acme Corporation"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            required
                        />
                        <GlassInput
                            label="Work Email"
                            type="email"
                            placeholder="you@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <GlassInput
                            label="Password"
                            type="password"
                            placeholder="Create a strong password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <GlassSelect
                            label="Your Role"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            options={[
                                { value: 'HR', label: 'HR Manager' },
                                { value: 'TECHNICAL_MANAGER', label: 'Technical Manager' },
                                { value: 'SUPER_ADMIN', label: 'Super Admin' },
                            ]}
                        />

                        <GlassButton
                            type="submit"
                            variant="primary"
                            size="lg"
                            isLoading={loading}
                            className="mt-2 w-full"
                        >
                            Create Account
                            <ArrowRight className="h-4 w-4" />
                        </GlassButton>
                    </form>

                    <p className="mt-6 text-center text-sm text-text-secondary">
                        Already have an account?{' '}
                        <Link to="/login" className="font-semibold text-accent hover:text-accent-hover">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
