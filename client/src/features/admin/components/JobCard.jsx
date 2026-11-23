import { Play, Square } from 'lucide-react';
import { useState } from 'react';
import { formatCount, formatPercent, formatRelativeTime } from '@/shared/lib/format';
import { Badge, Button, Card, ConfirmDialog, Input, ProgressBar, Select } from '@/shared/ui';
import { isRunning } from '../api';
import { useCancelJob, useStartJob } from '../hooks';
import { describeResult, JOB_STATUS_LABELS, JOB_TYPE_LABELS, SCOPE_OPTIONS, STOP_REASONS } from '../labels';
import styles from './JobCard.module.css';

const DEFAULT_PARAMS = {
    scraper: { fromPage: '1', toPage: '250' },
    embeddings: { scope: 'missing', limit: '' },
    emotions: { scope: 'missing', limit: '' },
};

/** Turns the form strings into API params, or returns a Romanian error message. */
const toParams = (type, values) => {
    const whole = (text) => (/^\d+$/.test(text.trim()) ? Number(text) : NaN);
    if (type === 'scraper') {
        const fromPage = whole(values.fromPage);
        const toPage = whole(values.toPage);
        if (!(fromPage >= 1) || !(toPage >= 1)) return { error: 'Paginile trebuie să fie numere întregi pozitive.' };
        if (fromPage > toPage) return { error: 'Pagina de start nu poate fi după pagina de final.' };
        return { params: { fromPage, toPage } };
    }
    if (values.limit.trim() === '') return { params: { scope: values.scope } };
    const limit = whole(values.limit);
    if (!(limit >= 1)) return { error: 'Limita trebuie să fie un număr întreg pozitiv.' };
    return { params: { scope: values.scope, limit } };
};

function RunningJob({ job }) {
    const cancel = useCancelJob();
    const percent = job.total ? (job.processed / job.total) * 100 : null;
    return (
        <div className={styles.running}>
            <div className={styles.progressHeader}>
                <Badge tone="primary" dot>În desfășurare</Badge>
                <span className={styles.numbers}>
                    {formatCount(job.processed)}{job.total ? ` / ${formatCount(job.total)}` : ''}
                    {percent !== null && ` · ${formatPercent(percent)}`}
                </span>
            </div>
            <ProgressBar value={job.processed} max={job.total ?? undefined} label="Progresul sarcinii" />
            <p className={styles.message}>Pornită {formatRelativeTime(job.startedAt)}. Poți închide pagina: sarcina rulează pe server.</p>
            {job.failed > 0 && <p className={styles.failures}>{formatCount(job.failed)} erori până acum</p>}
            <Button
                variant="neutral"
                size="sm"
                leftIcon={<Square />}
                loading={cancel.isPending}
                onClick={() => cancel.mutate(job.id)}
                className={styles.cancel}
            >
                Oprește
            </Button>
        </div>
    );
}

function LastRun({ job }) {
    const status = JOB_STATUS_LABELS[job.status];
    const summary = describeResult(job);
    return (
        <div className={styles.lastRun}>
            <div className={styles.progressHeader}>
                <span className={styles.lastRunLabel}>Ultima rulare</span>
                <Badge tone={status.tone}>{status.label}</Badge>
            </div>
            <p className={styles.message}>{formatRelativeTime(job.finishedAt ?? job.startedAt)}{summary ? ` · ${summary}` : ''}</p>
            {STOP_REASONS[job.status] && <p className={styles.failures}>{STOP_REASONS[job.status]}</p>}
            {job.status === 'failed' && job.message && <p className={styles.detail}>Detalii tehnice: {job.message}</p>}
        </div>
    );
}

/**
 * One background job type: its parameters, a start button, live progress while it runs and a
 * summary of the last run. `unavailable` (a Romanian reason) disables starting it.
 */
export default function JobCard({ type, icon, latestJob, unavailable }) {
    const [values, setValues] = useState(DEFAULT_PARAMS[type]);
    const [error, setError] = useState(null);
    const [confirming, setConfirming] = useState(null);
    const start = useStartJob();
    const labels = JOB_TYPE_LABELS[type];
    const running = isRunning(latestJob);

    const update = (field) => (event) => {
        setValues((current) => ({ ...current, [field]: event.target.value }));
        setError(null);
    };

    const submit = (event) => {
        event.preventDefault();
        const { params, error: validationError } = toParams(type, values);
        if (validationError) {
            setError(validationError);
            return;
        }
        // A full regeneration costs money and time: ask first.
        if (params.scope === 'all') setConfirming(params);
        else start.mutate({ type, params });
    };

    return (
        <Card className={styles.card}>
            <div className={styles.header}>
                <span className={styles.icon} aria-hidden="true">{icon}</span>
                <div>
                    <h3 className={styles.title}>{labels.title}</h3>
                    <p className={styles.description}>{labels.description}</p>
                </div>
            </div>

            {running ? <RunningJob job={latestJob} /> : (
                <form className={styles.form} onSubmit={submit} noValidate>
                    {type === 'scraper' ? (
                        <div className={styles.fields}>
                            <Input label="De la pagina" inputMode="numeric" value={values.fromPage} onChange={update('fromPage')} />
                            <Input label="Până la pagina" inputMode="numeric" value={values.toPage} onChange={update('toPage')} />
                        </div>
                    ) : (
                        <div className={styles.fields}>
                            <Select label="Ce cărți" value={values.scope} onChange={update('scope')}>
                                {SCOPE_OPTIONS[type].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </Select>
                            <Input
                                label="Limită (opțional)"
                                inputMode="numeric"
                                placeholder="fără limită"
                                hint="Ex: 100, pentru un test rapid."
                                value={values.limit}
                                onChange={update('limit')}
                            />
                        </div>
                    )}
                    {error && <p className={styles.failures} role="alert">{error}</p>}
                    {unavailable && <p className={styles.unavailable}>{unavailable}</p>}
                    <Button type="submit" leftIcon={<Play />} loading={start.isPending} disabled={Boolean(unavailable)}>
                        Pornește
                    </Button>
                </form>
            )}

            {!running && latestJob && <LastRun job={latestJob} />}

            <ConfirmDialog
                open={Boolean(confirming)}
                onCancel={() => setConfirming(null)}
                onConfirm={() => {
                    start.mutate({ type, params: confirming });
                    setConfirming(null);
                }}
                title="Pornești o regenerare completă?"
                description="Toate cărțile vor fi procesate din nou. Durează mai mult și consumă mai multe credite la furnizorul AI."
                confirmLabel="Da, pornește"
            />
        </Card>
    );
}
