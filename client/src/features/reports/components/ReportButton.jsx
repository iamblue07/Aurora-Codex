import { useMutation } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import useAuth from '@/features/auth/useAuth';
import { getErrorMessage } from '@/shared/api/error-messages';
import { Button, IconButton, Modal, Textarea } from '@/shared/ui';
import { REPORT_TARGET_LABELS, reportsApi } from '../api';

/**
 * Lets a signed-in user report a piece of content to the administrators.
 * Hidden for guests and for users whose reporting permission was revoked.
 */
export default function ReportButton({ targetType, targetId, variant = 'icon', className }) {
    const { isAuthenticated, permissions } = useAuth();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');

    const mutation = useMutation({
        mutationFn: () => reportsApi.create({ targetType, targetId, reason: reason.trim() }),
        onSuccess: () => {
            toast.success('Mulțumim! Un administrator va analiza raportul.');
            setOpen(false);
            setReason('');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nu am putut trimite raportul.')),
    });

    if (!isAuthenticated || permissions.canReport === false) return null;

    return (
        <>
            {variant === 'icon' ? (
                <IconButton label="Raportează" size="sm" onClick={() => setOpen(true)} className={className}>
                    <Flag />
                </IconButton>
            ) : (
                <Button variant="ghost" size="sm" leftIcon={<Flag />} onClick={() => setOpen(true)} className={className}>
                    Raportează
                </Button>
            )}
            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title="Raportează conținutul"
                description={`${REPORT_TARGET_LABELS[targetType]} · Spune-ne ce nu este în regulă.`}
                footer={(
                    <>
                        <Button variant="ghost" onClick={() => setOpen(false)}>Renunță</Button>
                        <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={reason.trim().length < 5}>
                            Trimite raportul
                        </Button>
                    </>
                )}
            >
                <Textarea
                    label="Motivul raportării"
                    placeholder="ex: conținut ofensator, înșelătorie, spam…"
                    value={reason}
                    maxLength={2000}
                    onChange={(event) => setReason(event.target.value)}
                    hint="Minimum 5 caractere."
                />
            </Modal>
        </>
    );
}
