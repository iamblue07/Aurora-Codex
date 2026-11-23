import { useMutation } from '@tanstack/react-query';
import { Lock, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import logo from '@/shared/assets/logo.webp';
import { getErrorMessage } from '@/shared/api/error-messages';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import { Button, Input, SegmentedControl } from '@/shared/ui';
import { authApi } from '../api';
import useAuth from '../useAuth';
import styles from './AuthPage.module.css';

const MIN_PASSWORD_LENGTH = 8;

const validateRegistration = ({ username, email, password, confirmPassword }) => {
    const errors = {};
    if (username.trim().length < 3) errors.username = 'Numele de utilizator trebuie să aibă cel puțin 3 caractere.';
    else if (!/^[\p{L}\p{N}_.-]+$/u.test(username.trim())) errors.username = 'Folosește doar litere, cifre, „.”, „_” și „-”.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Introdu o adresă de email validă.';
    if (password.length < MIN_PASSWORD_LENGTH) errors.password = `Parola trebuie să aibă cel puțin ${MIN_PASSWORD_LENGTH} caractere.`;
    if (confirmPassword !== password) errors.confirmPassword = 'Parolele nu se potrivesc.';
    return errors;
};

function LoginForm({ onSuccess }) {
    const [values, setValues] = useState({ email: '', password: '' });
    const mutation = useMutation({
        mutationFn: authApi.login,
        onSuccess,
        onError: (error) => toast.error(
            error.status === 401 ? 'Email sau parolă greșită.' : getErrorMessage(error, 'Conectarea a eșuat.'),
        ),
    });

    const update = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));

    return (
        <form
            className={styles.form}
            onSubmit={(event) => { event.preventDefault(); mutation.mutate(values); }}
            noValidate
        >
            <Input label="Email" type="email" autoComplete="email" leadingIcon={<Mail />} value={values.email} onChange={update('email')} required />
            <Input label="Parolă" type="password" autoComplete="current-password" leadingIcon={<Lock />} value={values.password} onChange={update('password')} required />
            <Button type="submit" size="lg" fullWidth loading={mutation.isPending} disabled={!values.email || !values.password}>
                Conectează-te
            </Button>
        </form>
    );
}

function RegisterForm({ onSuccess }) {
    const [values, setValues] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [errors, setErrors] = useState({});

    const mutation = useMutation({
        mutationFn: async ({ username, email, password }) => {
            const availability = await authApi.checkAvailability({ email, username });
            const conflicts = {};
            if (!availability.emailAvailable) conflicts.email = 'Există deja un cont cu acest email.';
            if (!availability.usernameAvailable) conflicts.username = 'Acest nume de utilizator este deja folosit.';
            if (Object.keys(conflicts).length) {
                setErrors(conflicts);
                return null;
            }
            return authApi.register({ username, email, password });
        },
        onSuccess: (session) => session && onSuccess(session),
        onError: (error) => toast.error(getErrorMessage(error, 'Înregistrarea a eșuat. Verifică datele introduse.')),
    });

    const update = (field) => (event) => {
        setValues((current) => ({ ...current, [field]: event.target.value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const submit = (event) => {
        event.preventDefault();
        const validation = validateRegistration(values);
        setErrors(validation);
        if (Object.keys(validation).length === 0) {
            mutation.mutate({ username: values.username.trim(), email: values.email.trim(), password: values.password });
        }
    };

    return (
        <form className={styles.form} onSubmit={submit} noValidate>
            <Input label="Nume de utilizator" autoComplete="username" leadingIcon={<User />} value={values.username} onChange={update('username')} error={errors.username} required />
            <Input label="Email" type="email" autoComplete="email" leadingIcon={<Mail />} value={values.email} onChange={update('email')} error={errors.email} required />
            <Input
                label="Parolă"
                type="password"
                autoComplete="new-password"
                leadingIcon={<Lock />}
                value={values.password}
                onChange={update('password')}
                error={errors.password}
                hint={`Minimum ${MIN_PASSWORD_LENGTH} caractere.`}
                required
            />
            <Input label="Confirmă parola" type="password" autoComplete="new-password" leadingIcon={<Lock />} value={values.confirmPassword} onChange={update('confirmPassword')} error={errors.confirmPassword} required />
            <Button type="submit" size="lg" fullWidth loading={mutation.isPending}>Creează contul</Button>
        </form>
    );
}

export default function AuthPage() {
    const [mode, setMode] = useState('login');
    const { signIn } = useAuth();
    useDocumentTitle(mode === 'login' ? 'Conectare' : 'Cont nou');

    // Signing in makes the GuestOnly route guard redirect to `?next=` (or home).
    const handleSuccess = (session) => {
        signIn(session);
        toast.success(mode === 'login' ? `Bine ai revenit, ${session.user.username}!` : 'Contul a fost creat. Bine ai venit!');
    };

    return (
        <div className={styles.page}>
            <aside className={styles.brandPanel} aria-hidden="true">
                <img src={logo} alt="" className={styles.brandLogo} />
                <p className={styles.brandName}>Aurora Codex</p>
                <p className={styles.brandTagline}>
                    Comunitatea ta de cititori: cărți, prețuri, recomandări inteligente și discuții.
                </p>
            </aside>

            <section className={styles.formPanel}>
                <h1 className={styles.title}>{mode === 'login' ? 'Bine ai revenit!' : 'Alătură-te comunității'}</h1>
                <p className={styles.subtitle}>
                    {mode === 'login'
                        ? 'Conectează-te pentru a-ți salva lecturile, a publica anunțuri și a discuta pe forumuri.'
                        : 'Creează un cont gratuit în mai puțin de un minut.'}
                </p>
                <SegmentedControl
                    className={styles.switcher}
                    label="Alege acțiunea"
                    value={mode}
                    onChange={setMode}
                    options={[
                        { value: 'login', label: 'Conectare' },
                        { value: 'register', label: 'Cont nou' },
                    ]}
                />
                {mode === 'login' ? <LoginForm onSuccess={handleSuccess} /> : <RegisterForm onSuccess={handleSuccess} />}
            </section>
        </div>
    );
}
