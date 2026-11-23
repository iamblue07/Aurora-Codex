import { Link } from 'react-router';
import logo from '@/shared/assets/logo.webp';
import { paths } from '../paths';
import styles from './Footer.module.css';

const SECTIONS = [
    {
        title: 'Descoperă',
        links: [
            { to: paths.catalog, label: 'Catalogul de cărți' },
            { to: paths.marketplace, label: 'Bazarul cititorilor' },
            { to: paths.forums, label: 'Forumuri' },
            { to: paths.statistics, label: 'Statistici' },
        ],
    },
    {
        title: 'Contul tău',
        links: [
            { to: paths.profile, label: 'Profil' },
            { to: paths.readingHistory, label: 'Istoric de lectură' },
            { to: paths.myListings, label: 'Anunțurile mele' },
            { to: paths.chats, label: 'Conversații' },
        ],
    },
];

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.inner}>
                <div className={styles.about}>
                    <Link to={paths.home} className={styles.brand}>
                        <img src={logo} alt="" width="32" height="32" />
                        <span>Aurora Codex</span>
                    </Link>
                    <p className={styles.blurb}>
                        O casă pentru cititori: compară prețurile librăriilor din România, primește recomandări AI,
                        vinde cărțile citite și discută cu comunitatea.
                    </p>
                </div>
                {SECTIONS.map((section) => (
                    <nav key={section.title} className={styles.section} aria-label={section.title}>
                        <h2 className={styles.sectionTitle}>{section.title}</h2>
                        <ul role="list" className={styles.list}>
                            {section.links.map((link) => (
                                <li key={link.to}><Link to={link.to} className={styles.link}>{link.label}</Link></li>
                            ))}
                        </ul>
                    </nav>
                ))}
            </div>
            <div className={styles.bottom}>
                <p>© {new Date().getFullYear()} Aurora Codex · Proiect de licență</p>
            </div>
        </footer>
    );
}
