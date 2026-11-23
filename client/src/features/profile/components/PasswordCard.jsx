import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, Input } from '@/shared/ui';
import { useChangePassword } from '../hooks';
import styles from './ProfileCards.module.css';

const MIN_LENGTH = 8;
const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function PasswordCard() {
    const [values, setValues] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const change = useChangePassword();

    const update = (field) => (event) => {
        setValues((current) => ({ ...current, [field]: event.target.value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const submit = (event) => {
        event.preventDefault();
        const validation = {};
        if (!values.currentPassword) validation.currentPassword = 'Introdu parola curentă.';
        if (values.newPassword.length < MIN_LENGTH) validation.newPassword = `Minimum ${MIN_LENGTH} caractere.`;
        else if (values.newPassword === values.currentPassword) validation.newPassword = 'Parola nouă trebuie să fie diferită de cea curentă.';
        if (values.confirmPassword !== values.newPassword) validation.confirmPassword = 'Parolele nu se potrivesc.';
        setErrors(validation);
        if (Object.keys(validation).length) return;
        change.mutate(
            { currentPassword: values.currentPassword, newPassword: values.newPassword },
            { onSuccess: () => setValues(EMPTY) },
        );
    };

    return (
        <Card as="section" className={styles.card}>
            <header className={styles.cardHeader}>
                <span className={styles.cardIcon} aria-hidden="true"><KeyRound /></span>
                <div>
                    <h2 className={styles.cardTitle}>Schimbă parola</h2>
                    <p className={styles.cardHint}>Folosește o parolă lungă, pe care nu o mai folosești în altă parte.</p>
                </div>
            </header>
            <form className={styles.form} onSubmit={submit} noValidate>
                <Input label="Parola curentă" type="password" autoComplete="current-password" value={values.currentPassword} onChange={update('currentPassword')} error={errors.currentPassword} />
                <div className={styles.formRow}>
                    <Input label="Parola nouă" type="password" autoComplete="new-password" value={values.newPassword} onChange={update('newPassword')} error={errors.newPassword} />
                    <Input label="Confirmă parola nouă" type="password" autoComplete="new-password" value={values.confirmPassword} onChange={update('confirmPassword')} error={errors.confirmPassword} />
                </div>
                <div className={styles.cardFooter}>
                    <Button type="submit" variant="neutral" loading={change.isPending}>Actualizează parola</Button>
                </div>
            </form>
        </Card>
    );
}
