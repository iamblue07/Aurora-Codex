import { CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { paths } from '@/app/paths';
import { Button, ConfirmDialog, Input, Modal } from '@/shared/ui';
import { useCloseListing, useDeleteListing, useUpdateListing } from '../hooks';
import styles from './ListingOwnerActions.module.css';

function EditListingModal({ listing, open, onClose }) {
    const [price, setPrice] = useState(String(listing.price));
    const [isNegotiable, setIsNegotiable] = useState(listing.isNegotiable);
    const update = useUpdateListing();
    const priceNumber = Number(price.replace(',', '.'));
    const isValid = price !== '' && Number.isFinite(priceNumber) && priceNumber >= 0;

    const save = () => update.mutate(
        { id: listing.id, changes: { price: priceNumber, isNegotiable } },
        { onSuccess: onClose },
    );

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Modifică anunțul"
            size="sm"
            footer={(
                <>
                    <Button variant="ghost" onClick={onClose}>Renunță</Button>
                    <Button onClick={save} loading={update.isPending} disabled={!isValid}>Salvează</Button>
                </>
            )}
        >
            <div className={styles.form}>
                <Input
                    label="Preț (lei)"
                    inputMode="decimal"
                    value={price}
                    onChange={(event) => setPrice(event.target.value.replace(/[^\d.,]/g, ''))}
                    error={!isValid ? 'Introdu un preț valid.' : undefined}
                />
                <label className={styles.switch}>
                    <input type="checkbox" checked={isNegotiable} onChange={(event) => setIsNegotiable(event.target.checked)} />
                    <span>Prețul este negociabil</span>
                </label>
            </div>
        </Modal>
    );
}

/** Edit / close / delete buttons shown to the owner of a listing. */
export default function ListingOwnerActions({ listing, compact = false, onDeleted }) {
    const navigate = useNavigate();
    const [dialog, setDialog] = useState(null);
    const close = useCloseListing();
    const remove = useDeleteListing();

    const handleDelete = () => remove.mutate(listing.id, {
        onSuccess: () => {
            setDialog(null);
            if (onDeleted) onDeleted();
            else navigate(paths.myListings);
        },
    });

    return (
        <div className={compact ? styles.compact : styles.actions}>
            {listing.isAvailable && (
                <>
                    <Button variant="secondary" size={compact ? 'sm' : 'md'} leftIcon={<Pencil />} onClick={() => setDialog('edit')} fullWidth={!compact}>
                        Modifică prețul
                    </Button>
                    <Button variant="neutral" size={compact ? 'sm' : 'md'} leftIcon={<CheckCircle2 />} onClick={() => setDialog('close')} fullWidth={!compact}>
                        Marchează ca vândut
                    </Button>
                </>
            )}
            <Button variant="danger" size={compact ? 'sm' : 'md'} leftIcon={<Trash2 />} onClick={() => setDialog('delete')} fullWidth={!compact}>
                Șterge
            </Button>

            {dialog === 'edit' && <EditListingModal listing={listing} open onClose={() => setDialog(null)} />}
            <ConfirmDialog
                open={dialog === 'close'}
                title="Închizi anunțul?"
                description="Anunțul nu va mai apărea în bazar și nu mai poate fi redeschis."
                confirmLabel="Da, închide-l"
                tone="neutral"
                loading={close.isPending}
                onConfirm={() => close.mutate(listing.id, { onSuccess: () => setDialog(null) })}
                onCancel={() => setDialog(null)}
            />
            <ConfirmDialog
                open={dialog === 'delete'}
                title="Ștergi anunțul definitiv?"
                description="Anunțul și toate conversațiile despre el vor fi șterse. Acțiunea nu poate fi anulată."
                confirmLabel="Șterge definitiv"
                loading={remove.isPending}
                onConfirm={handleDelete}
                onCancel={() => setDialog(null)}
            />
        </div>
    );
}
