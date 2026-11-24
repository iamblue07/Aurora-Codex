import clsx from 'clsx';
import { Heart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import { formatCount } from '@/shared/lib/format';
import { useToggleFavorite } from '../hooks';
import styles from './FavoriteButton.module.css';

/**
 * Heart that saves a listing. `variant="overlay"` sits on a photo, `"pill"` is a labelled pill
 * (listing page). Hidden on the seller's own listings; anonymous visitors are sent to log in.
 */
export default function FavoriteButton({ listing, variant = 'overlay', className }) {
    const { user, isAuthenticated } = useAuth();
    const toggle = useToggleFavorite();
    const navigate = useNavigate();
    const location = useLocation();
    if (user && listing.seller?.id === user.id) return null;

    const active = Boolean(listing.isFavorite);
    const onClick = (event) => {
        event.preventDefault(); // cards are links
        event.stopPropagation();
        if (!isAuthenticated) {
            navigate(`${paths.login}?next=${encodeURIComponent(location.pathname + location.search)}`);
            return;
        }
        toggle.mutate({ id: listing.id, favorite: !active });
    };
    const label = active ? 'Scoate de la favorite' : 'Salvează la favorite';

    return (
        <button
            type="button"
            className={clsx(styles.button, styles[variant], active && styles.active, className)}
            aria-pressed={active}
            aria-label={variant === 'overlay' ? label : undefined}
            title={label}
            disabled={toggle.isPending}
            onClick={onClick}
        >
            <Heart aria-hidden="true" />
            {variant === 'pill' && (
                <span>{active ? 'Salvat' : 'Salvează'}{listing.favoriteCount > 0 && ` · ${formatCount(listing.favoriteCount)}`}</span>
            )}
        </button>
    );
}
