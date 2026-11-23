import { Camera, Check, Pencil, ShieldCheck, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import { formatDate } from '@/shared/lib/format';
import { Avatar, Badge, Button, Card, IconButton, Textarea } from '@/shared/ui';
import { useUpdateAccount, useUploadAvatar } from '../hooks';
import styles from './AccountCard.module.css';

/** The signed-in user's identity card: photo, name, description (editable). */
export default function AccountCard({ account }) {
    const fileRef = useRef(null);
    const upload = useUploadAvatar();
    const updateAccount = useUpdateAccount();
    const [editing, setEditing] = useState(false);
    const [description, setDescription] = useState(account.description);

    const saveDescription = () => updateAccount.mutate(
        { description: description.trim() },
        { onSuccess: () => setEditing(false) },
    );

    return (
        <Card className={styles.card} padding="lg">
            <div className={styles.cover} aria-hidden="true" />
            <div className={styles.avatarWrap}>
                <Avatar src={account.avatarUrl} name={account.username} size="xl" />
                <IconButton label="Schimbă fotografia" variant="primary" size="sm" className={styles.avatarButton} onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
                    <Camera />
                </IconButton>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="visually-hidden"
                    tabIndex={-1}
                    onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file); event.target.value = ''; }}
                />
            </div>

            <div className={styles.identity}>
                <h1 className={styles.name}>{account.username}</h1>
                {account.isAdmin && <Badge tone="primary"><ShieldCheck /> Administrator</Badge>}
            </div>
            <p className={styles.meta}>{account.email} · membru din {formatDate(account.createdAt)}</p>

            <div className={styles.description}>
                {editing ? (
                    <>
                        <Textarea
                            aria-label="Descriere"
                            value={description}
                            rows={4}
                            maxLength={2000}
                            autoFocus
                            placeholder="Spune-le celorlalți cititori ceva despre tine…"
                            onChange={(event) => setDescription(event.target.value)}
                        />
                        <div className={styles.descriptionActions}>
                            <Button variant="ghost" size="sm" leftIcon={<X />} onClick={() => { setDescription(account.description); setEditing(false); }}>Renunță</Button>
                            <Button size="sm" leftIcon={<Check />} loading={updateAccount.isPending} onClick={saveDescription}>Salvează</Button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className={account.description ? styles.descriptionText : styles.descriptionEmpty}>
                            {account.description || 'Nu ai adăugat încă o descriere.'}
                        </p>
                        <Button variant="ghost" size="sm" leftIcon={<Pencil />} onClick={() => setEditing(true)}>Editează descrierea</Button>
                    </>
                )}
            </div>

            <Link to={paths.user(account.id)} className={styles.publicLink}>Vezi profilul tău public →</Link>
        </Card>
    );
}
