import clsx from 'clsx';
import {
    BookMarked, ChevronDown, LayoutDashboard, LogOut, Menu as MenuIcon, MessagesSquare, Moon, ShieldAlert,
    Settings2, Sparkles, Store, Sun, User, X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import useAuth from '@/features/auth/useAuth';
import logo from '@/shared/assets/logo.webp';
import useClickOutside from '@/shared/hooks/useClickOutside';
import { Avatar, Button, IconButton, Menu } from '@/shared/ui';
import { paths } from '../paths';
import useTheme from '../providers/useTheme';
import styles from './Header.module.css';

const NAV_LINKS = [
    { to: paths.home, label: 'Acasă', end: true },
    { to: paths.catalog, label: 'Cărți' },
    { to: paths.marketplace, label: 'Bazar' },
    { to: paths.forums, label: 'Forumuri' },
    { to: paths.statistics, label: 'Statistici' },
];

function UserMenu() {
    const { user, isAdmin, signOut } = useAuth();
    const navigate = useNavigate();

    const items = [
        { label: 'Profilul meu', icon: <User />, to: paths.profile },
        { label: 'Recomandări pentru mine', icon: <Sparkles />, to: `${paths.catalog}?tab=ai` },
        { label: 'Istoricul de lectură', icon: <BookMarked />, to: paths.readingHistory },
        { label: 'Anunțurile mele', icon: <Store />, to: paths.myListings },
        { label: 'Conversațiile mele', icon: <MessagesSquare />, to: paths.chats },
        { label: 'Discuțiile mele', icon: <LayoutDashboard />, to: paths.myForums },
        ...(isAdmin ? [
            'divider',
            { label: 'Panou de administrare', icon: <Settings2 />, to: paths.admin },
            { label: 'Rapoarte', icon: <ShieldAlert />, to: paths.reports },
        ] : []),
        'divider',
        {
            label: 'Deconectează-te',
            icon: <LogOut />,
            tone: 'danger',
            onClick: () => {
                signOut();
                toast.success('Te-ai deconectat. Pe curând!');
                navigate(paths.home);
            },
        },
    ];

    return (
        <Menu
            items={items}
            trigger={({ open, toggle }) => (
                <button type="button" className={styles.userButton} onClick={toggle} aria-expanded={open} aria-haspopup="menu">
                    <Avatar src={user?.avatarUrl} name={user?.username ?? ''} size="sm" />
                    <span className={styles.username}>{user?.username ?? '…'}</span>
                    <ChevronDown className={clsx(styles.chevron, open && styles.chevronOpen)} aria-hidden="true" />
                </button>
            )}
        />
    );
}

export default function Header() {
    const { isAuthenticated } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();
    const headerRef = useRef(null);
    const closeMobileMenu = useCallback(() => setMobileOpen(false), []);

    useEffect(closeMobileMenu, [location.pathname, closeMobileMenu]);
    // Escape or a tap anywhere below the header closes the mobile menu.
    useClickOutside(headerRef, closeMobileMenu, mobileOpen);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const themeLabel = theme === 'dark' ? 'Temă luminoasă' : 'Temă întunecată';

    return (
        <header ref={headerRef} className={clsx(styles.header, scrolled && styles.scrolled)}>
            <div className={styles.inner}>
                <Link to={paths.home} className={styles.brand} aria-label="Aurora Codex — pagina principală">
                    <img src={logo} alt="" width="36" height="36" className={styles.logo} />
                    <span className={styles.wordmark}>Aurora Codex</span>
                </Link>

                <nav id="main-navigation" className={clsx(styles.nav, mobileOpen && styles.navOpen)} aria-label="Navigare principală">
                    <ul className={styles.links} role="list">
                        {NAV_LINKS.map((link) => (
                            <li key={link.to}>
                                <NavLink to={link.to} end={link.end} className={({ isActive }) => clsx(styles.link, isActive && styles.active)}>
                                    {link.label}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                    {!isAuthenticated && (
                        <Button to={paths.login} size="sm" className={styles.mobileLogin}>Conectează-te</Button>
                    )}
                </nav>

                <div className={styles.actions}>
                    <IconButton label={themeLabel} onClick={toggleTheme}>
                        {theme === 'dark' ? <Sun /> : <Moon />}
                    </IconButton>
                    {isAuthenticated ? (
                        <UserMenu />
                    ) : (
                        <Button to={paths.login} size="sm" className={styles.desktopLogin}>Conectează-te</Button>
                    )}
                    <IconButton
                        label={mobileOpen ? 'Închide meniul' : 'Deschide meniul'}
                        className={styles.menuToggle}
                        onClick={() => setMobileOpen((open) => !open)}
                        aria-expanded={mobileOpen}
                        aria-controls="main-navigation"
                    >
                        {mobileOpen ? <X /> : <MenuIcon />}
                    </IconButton>
                </div>
            </div>
        </header>
    );
}
