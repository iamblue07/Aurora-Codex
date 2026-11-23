import clsx from 'clsx';
import { ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useSearchParamsState from '@/shared/hooks/useSearchParamsState';
import { formatRelativeTime } from '@/shared/lib/format';
import { Card, EmptyState, ErrorState, PageHeader, Pagination, SegmentedControl, Skeleton } from '@/shared/ui';
import { REPORT_TARGET_LABELS } from '../api';
import ReportDetails from '../components/ReportDetails';
import { useReports } from '../hooks';
import styles from './ReportsPage.module.css';

const PAGE_SIZE = 12;
const DEFAULT_FILTERS = { status: 'open', page: 1, report: '' };

export default function ReportsPage() {
    useDocumentTitle('Rapoarte');
    const [filters, setFilters] = useSearchParamsState(DEFAULT_FILTERS);
    const [, setSearchParams] = useSearchParams();
    const reports = useReports({ status: filters.status, page: filters.page, limit: PAGE_SIZE });

    // Selecting a report keeps the current page (useSearchParamsState would reset it).
    const selectReport = (id) => setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set('report', String(id));
        return next;
    });

    return (
        <div>
            <PageHeader eyebrow="Administrare" title="Rapoarte" subtitle="Analizează conținutul raportat de comunitate și ia măsurile potrivite." />

            <SegmentedControl
                className={styles.tabs}
                label="Starea rapoartelor"
                value={filters.status}
                onChange={(status) => setFilters({ status, report: '' })}
                options={[
                    { value: 'open', label: 'Deschise' },
                    { value: 'closed', label: 'Rezolvate' },
                    { value: 'all', label: 'Toate' },
                ]}
            />

            {reports.isError ? <ErrorState onRetry={reports.refetch} /> : reports.data?.total === 0 ? (
                <EmptyState icon={<ShieldCheck />} title="Niciun raport aici" description="Comunitatea se poartă frumos. 🎉" />
            ) : (
                <div className={styles.layout}>
                    <div>
                        <ul className={styles.list} role="list">
                            {reports.isPending
                                ? Array.from({ length: 5 }, (_, index) => <li key={index}><Skeleton height="4.5rem" radius="var(--radius-md)" /></li>)
                                : reports.data.items.map((report) => (
                                    <li key={report.id}>
                                        <button
                                            type="button"
                                            className={clsx(styles.item, String(report.id) === filters.report && styles.active)}
                                            onClick={() => selectReport(report.id)}
                                        >
                                            <span className={styles.itemTop}>
                                                <span className={styles.type}>{REPORT_TARGET_LABELS[report.targetType]}</span>
                                                <time className={styles.time}>{formatRelativeTime(report.createdAt)}</time>
                                            </span>
                                            <span className={styles.reason}>{report.reason}</span>
                                            <span className={styles.reporter}>de {report.reporter?.username ?? 'utilizator șters'}</span>
                                        </button>
                                    </li>
                                ))}
                        </ul>
                        <Pagination page={filters.page} totalPages={reports.data?.totalPages} onPageChange={(page) => setFilters({ page, report: filters.report })} />
                    </div>
                    <Card className={styles.detail} padding="lg">
                        {filters.report
                            ? <ReportDetails key={filters.report} reportId={filters.report} />
                            : <p className={styles.placeholder}>Alege un raport din listă pentru a-l analiza.</p>}
                    </Card>
                </div>
            )}
        </div>
    );
}
