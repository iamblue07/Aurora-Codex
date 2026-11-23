import { History } from 'lucide-react';
import { formatCount, formatDateTime } from '@/shared/lib/format';
import { Badge, Card, EmptyState } from '@/shared/ui';
import { describeResult, JOB_STATUS_LABELS, JOB_TYPE_LABELS, STOP_REASONS } from '../labels';
import styles from './JobHistory.module.css';

const duration = (job) => {
    if (!job.finishedAt) return '—';
    const seconds = Math.max(0, Math.round((new Date(job.finishedAt) - new Date(job.startedAt)) / 1000));
    if (seconds < 60) return `${seconds} s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ${seconds % 60} s`;
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

/** Table of the most recent background jobs. */
export default function JobHistory({ jobs }) {
    if (jobs.length === 0) {
        return (
            <EmptyState
                icon={<History />}
                title="Nicio sarcină rulată încă"
                description="Sarcinile pornite din acest panou apar aici, cu rezultatele lor."
                compact
            />
        );
    }

    return (
        <Card padding="none" className={styles.wrap}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th scope="col">Sarcina</th>
                        <th scope="col">Stare</th>
                        <th scope="col">Progres</th>
                        <th scope="col">Pornită</th>
                        <th scope="col">Durată</th>
                        <th scope="col">Rezultat</th>
                    </tr>
                </thead>
                <tbody>
                    {jobs.map((job) => {
                        const status = JOB_STATUS_LABELS[job.status];
                        const summary = describeResult(job);
                        return (
                            <tr key={job.id}>
                                <td className={styles.type}>{JOB_TYPE_LABELS[job.type]?.title ?? job.type}</td>
                                <td><Badge tone={status.tone}>{status.label}</Badge></td>
                                <td className={styles.numeric}>
                                    {formatCount(job.processed)}{job.total ? ` / ${formatCount(job.total)}` : ''}
                                </td>
                                <td>
                                    {formatDateTime(job.startedAt)}
                                    {job.startedBy && <span className={styles.by}>de {job.startedBy.username}</span>}
                                </td>
                                <td className={styles.numeric}>{duration(job)}</td>
                                <td className={styles.result}>
                                    {summary}
                                    {STOP_REASONS[job.status] && <span className={styles.message}>{STOP_REASONS[job.status]}</span>}
                                    {job.status === 'failed' && job.message && (
                                        <span className={styles.detail}>Detalii tehnice: {job.message}</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </Card>
    );
}
