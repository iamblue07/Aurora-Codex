import { useQueryClient } from '@tanstack/react-query';
import { Brain, Globe, ListChecks, Settings2, ShieldAlert, Smile } from 'lucide-react';
import { useEffect } from 'react';
import { paths } from '@/app/paths';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useSearchParamsState from '@/shared/hooks/useSearchParamsState';
import { queryKeys } from '@/shared/lib/query-keys';
import { Button, ErrorState, PageHeader, SegmentedControl, Skeleton } from '@/shared/ui';
import AiOverview from '../components/AiOverview';
import JobCard from '../components/JobCard';
import JobHistory from '../components/JobHistory';
import SettingsForm from '../components/SettingsForm';
import { isRunning } from '../api';
import { useAdminSettings, useAiStatus, useJobs } from '../hooks';
import styles from './AdminPage.module.css';

const TABS = [
    { value: 'jobs', label: 'Sarcini', icon: <ListChecks /> },
    { value: 'settings', label: 'Setări', icon: <Settings2 /> },
];
const FILTER_DEFAULTS = { tab: 'jobs' };

const JOB_CARDS = [
    { type: 'embeddings', icon: <Brain /> },
    { type: 'emotions', icon: <Smile /> },
    { type: 'scraper', icon: <Globe /> },
];

function JobsTab() {
    const queryClient = useQueryClient();
    const status = useAiStatus();
    const jobs = useJobs();
    const runningKey = (jobs.data ?? []).filter(isRunning).map((job) => job.id).join(',');

    // When a job starts or finishes, the coverage numbers change: refresh them.
    useEffect(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.aiStatus });
    }, [runningKey, queryClient]);

    if (status.isError || jobs.isError) {
        return <ErrorState onRetry={() => { status.refetch(); jobs.refetch(); }} />;
    }

    const latestByType = (type) => jobs.data?.find((job) => job.type === type);
    const unavailableReason = (type) => {
        if (!status.data) return 'Se verifică…';
        if (type === 'scraper') {
            return status.data.scraper.available ? null : 'Scraperul are nevoie de pachetul opțional „puppeteer” instalat pe server.';
        }
        return status.data.provider.configured ? null : 'Adaugă cheia DeepInfra pe server pentru a porni această sarcină.';
    };

    return (
        <div className={styles.sections}>
            <section aria-labelledby="ai-status">
                <h2 id="ai-status" className={styles.sectionTitle}>Starea sistemului AI</h2>
                <AiOverview status={status.data} />
            </section>

            <section aria-labelledby="jobs">
                <h2 id="jobs" className={styles.sectionTitle}>Sarcini</h2>
                <p className={styles.sectionText}>
                    Pentru recomandări, generează întâi vectorii semantici. După ce scraperul adaugă cărți noi,
                    rulează din nou vectorii și analiza emoțională: sunt procesate doar cărțile noi sau modificate.
                </p>
                <div className={styles.jobGrid}>
                    {JOB_CARDS.map(({ type, icon }) => (
                        jobs.isPending
                            ? <Skeleton key={type} height="18rem" radius="var(--radius-lg)" />
                            : <JobCard key={type} type={type} icon={icon} latestJob={latestByType(type)} unavailable={unavailableReason(type)} />
                    ))}
                </div>
            </section>

            <section aria-labelledby="history">
                <h2 id="history" className={styles.sectionTitle}>Istoric</h2>
                {jobs.isPending ? <Skeleton height="12rem" radius="var(--radius-lg)" /> : <JobHistory jobs={jobs.data} />}
            </section>
        </div>
    );
}

function SettingsTab() {
    const settings = useAdminSettings();
    if (settings.isError) return <ErrorState onRetry={settings.refetch} />;
    if (settings.isPending) return <Skeleton height="30rem" radius="var(--radius-lg)" />;
    return <SettingsForm settings={settings.data} />;
}

/** Administration: AI features (status, jobs, settings). Moderation lives on the reports page. */
export default function AdminPage() {
    useDocumentTitle('Administrare');
    const [{ tab }, setFilters] = useSearchParamsState(FILTER_DEFAULTS);

    return (
        <div>
            <PageHeader
                eyebrow="Administrare"
                title="Panou de administrare"
                subtitle="Recomandările AI, catalogul de cărți și parametrii lor."
                actions={<Button variant="soft" leftIcon={<ShieldAlert />} to={paths.reports}>Rapoarte</Button>}
            />
            <SegmentedControl
                className={styles.tabs}
                label="Secțiune"
                options={TABS}
                value={tab}
                onChange={(value) => setFilters({ tab: value })}
            />
            {tab === 'settings' ? <SettingsTab /> : <JobsTab />}
        </div>
    );
}
