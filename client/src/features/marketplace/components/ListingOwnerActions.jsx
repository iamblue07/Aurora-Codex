import { BookmarkCheck, BookmarkX, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { paths } from '@/app/paths';
import { Button, ConfirmDialog } from '@/shared/ui';
import { useCloseListing, useDeleteListing, useUpdateListing } from '../hooks';
import styles from './ListingOwnerActions.module.css';

/** Seller tools for a listing: edit, reserve / release, mark as sold and delete. */
export default function ListingOwnerActions({ listing, compact = false, onDeleted }) {
    const navigate = useNavigate();
    const [dialog, setDialog] = useState(null);
    const close = useCloseListing();
    const remove = useDeleteListing();
    const reserve = useUpdateListing({ successMessage: null });
    const size = compact ? 'sm' : 'md';
    const full = !compact;

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
                    <Button variant="secondary" size={size} leftIcon={<Pencil />} to={paths.editListing(listing.id)} fullWidth={full}>
                        Editează
                    </Button>
                    <Button
                        variant="secondary"
                        size={size}
                        leftIcon={listing.isReserved ? <BookmarkX /> : <BookmarkCheck />}
                        loading={reserve.isPending}
                        onClick={() => reserve.mutate({ id: listing.id, changes: { isReserved: !listing.isReserved } })}
                        fullWidth={full}
                    >
                        {listing.isReserved ? 'Anulează rezervarea' : 'Marchează rezervat'}
                    </Button>
                    <Button variant="neutral" size={size} leftIcon={<CheckCircle2 />} onClick={() => setDialog('close')} fullWidth={full}>
                        Marchează ca vândut
                    </Button>
                </>
            )}
            <Button variant="danger" size={size} leftIcon={<Trash2 />} onClick={() => setDialog('delete')} fullWidth={full}>
                Șterge
            </Button>

            <ConfirmDialog
                open={dialog === 'close'}
                title="Marchezi cartea ca vândută?"
                description="Anunțul rămâne vizibil ca „Vândut”, dar nu mai apare în bazar și nu mai poate fi redeschis."
                confirmLabel="Da, am vândut-o"
                tone="neutral"
                loading={close.isPending}
                onConfirm={() => close.mutate(listing.id, { onSuccess: () => setDialog(null) })}
                onCancel={() => setDialog(null)}
            />
            <ConfirmDialog
                open={dialog === 'delete'}
                title="Ștergi anunțul definitiv?"
                description="Anunțul, fotografiile și toate conversațiile despre el vor fi șterse. Acțiunea nu poate fi anulată."
                confirmLabel="Șterge definitiv"
                loading={remove.isPending}
                onConfirm={handleDelete}
                onCancel={() => setDialog(null)}
            />
        </div>
    );
}
