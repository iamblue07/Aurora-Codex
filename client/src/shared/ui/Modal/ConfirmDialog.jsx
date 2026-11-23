import Button from '../Button/Button';
import Modal from './Modal';

/** Yes/no confirmation, used before destructive actions (delete, close, revoke…). */
export default function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = 'Confirmă',
    cancelLabel = 'Renunță',
    tone = 'danger',
    loading = false,
    onConfirm,
    onCancel,
}) {
    return (
        <Modal
            open={open}
            onClose={onCancel}
            title={title}
            description={description}
            size="sm"
            footer={(
                <>
                    <Button variant="ghost" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
                    <Button variant={tone === 'danger' ? 'primary' : 'neutral'} onClick={onConfirm} loading={loading}>
                        {confirmLabel}
                    </Button>
                </>
            )}
        />

    );
}
