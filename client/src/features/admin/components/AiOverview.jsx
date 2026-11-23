import { Brain, CircleCheck, CircleAlert, Cpu, PlugZap, Smile } from 'lucide-react';
import { formatCount, formatPercent } from '@/shared/lib/format';
import { Badge, Button, Card, ProgressBar, Skeleton } from '@/shared/ui';
import { useTestAiConnection } from '../hooks';
import styles from './AiOverview.module.css';

const share = (part, whole) => (whole ? (part / whole) * 100 : 0);

function Tile({ icon, title, children, footer }) {
    return (
        <Card className={styles.tile}>
            <div className={styles.tileHeader}>
                <span className={styles.tileIcon} aria-hidden="true">{icon}</span>
                <h3 className={styles.tileTitle}>{title}</h3>
            </div>
            <div className={styles.tileBody}>{children}</div>
            {footer && <div className={styles.tileFooter}>{footer}</div>}
        </Card>
    );
}

function ConnectionTile({ provider }) {
    const test = useTestAiConnection();
    return (
        <Tile
            icon={<PlugZap />}
            title="Conexiune AI"
            footer={(
                <Button size="sm" variant="soft" loading={test.isPending} disabled={!provider.configured} onClick={() => test.mutate()}>
                    Testează conexiunea
                </Button>
            )}
        >
            <div className={styles.row}>
                <span className={styles.value}>{provider.name}</span>
                <Badge tone={provider.configured ? 'success' : 'warning'} dot>
                    {provider.configured ? 'Cheie configurată' : 'Lipsește cheia'}
                </Badge>
            </div>
            {!provider.configured && (
                <p className={styles.muted}>Adaugă <code>DEEPINFRA_API_KEY</code> în fișierul <code>.env</code> al serverului și repornește-l.</p>
            )}
            {test.isSuccess && (
                <p className={styles.ok}>
                    <CircleCheck aria-hidden="true" /> Funcționează: {test.data.storedDimensions} dimensiuni
                    {test.data.nativeDimensions !== test.data.storedDimensions && ` (din ${test.data.nativeDimensions})`}, {test.data.latencyMs} ms
                </p>
            )}
            {test.isError && (
                <p className={styles.error}>
                    <CircleAlert aria-hidden="true" /> Conexiunea a eșuat. <span className={styles.detail}>Detalii tehnice: {test.error.message}</span>
                </p>
            )}
        </Tile>
    );
}

function CoverageTile({ icon, title, done, total, model, note }) {
    return (
        <Tile icon={icon} title={title}>
            <div className={styles.row}>
                <span className={styles.value}>{formatPercent(share(done, total))}</span>
                <span className={styles.muted}>{formatCount(done)} din {formatCount(total)} cărți</span>
            </div>
            <ProgressBar value={done} max={total || 1} label={title} tone={done >= total ? 'success' : 'primary'} />
            <p className={styles.model} title={model}>{model}</p>
            {note && <p className={styles.warning}>{note}</p>}
        </Tile>
    );
}

/** Health of the AI features: provider connection, catalogue coverage and the search index. */
export default function AiOverview({ status }) {
    if (!status) {
        return (
            <div className={styles.grid} aria-busy="true">
                {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} height="11rem" radius="var(--radius-lg)" />)}
            </div>
        );
    }

    const { provider, catalogue, embeddings, emotions, index } = status;
    return (
        <div className={styles.grid}>
            <ConnectionTile provider={provider} />
            <CoverageTile
                icon={<Brain />}
                title="Vectori semantici"
                done={embeddings.embeddedBooks}
                total={catalogue.totalBooks}
                model={`${embeddings.model} · ${embeddings.dimensions} dimensiuni`}
                note={embeddings.outdatedBooks > 0
                    ? `${formatCount(embeddings.outdatedBooks)} vectori făcuți cu alt model sau altă dimensiune nu sunt folosiți.`
                    : null}
            />
            <CoverageTile
                icon={<Smile />}
                title="Scoruri emoționale"
                done={emotions.scoredBooks}
                total={emotions.eligibleBooks}
                model={emotions.model}
            />
            <Tile icon={<Cpu />} title="Index de căutare">
                {index.loaded ? (
                    <>
                        <div className={styles.row}>
                            <span className={styles.value}>{formatCount(index.vectors)}</span>
                            <span className={styles.muted}>vectori în memorie</span>
                        </div>
                        <p className={styles.muted}>{index.memoryMb} MB · {index.dimensions} dimensiuni</p>
                    </>
                ) : (
                    <p className={styles.muted}>
                        {index.loading ? 'Se încarcă…' : 'Se încarcă automat la prima recomandare cerută după ce vectorii se schimbă.'}
                    </p>
                )}
            </Tile>
        </div>
    );
}
