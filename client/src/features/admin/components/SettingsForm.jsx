import { RotateCcw, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Card, IconButton, Input } from '@/shared/ui';
import { useUpdateSettings } from '../hooks';
import { SETTING_GROUPS, SETTING_LABELS } from '../labels';
import { parseSettingInput } from '../settings-input';
import styles from './SettingsForm.module.css';

const toText = (value) => (typeof value === 'boolean' ? value : String(value));

function SettingField({ definition, text, savedValue, error, onChange, onReset }) {
    const labels = SETTING_LABELS[definition.key] ?? { label: definition.key };
    const isDefault = savedValue === definition.default;
    const defaultHint = `Implicit: ${typeof definition.default === 'boolean' ? (definition.default ? 'da' : 'nu') : definition.default || '(gol)'}`;
    const hint = [labels.hint, defaultHint].filter(Boolean).join(' ');

    if (definition.type === 'boolean') {
        return (
            <label className={styles.checkbox}>
                <input type="checkbox" checked={text} onChange={(event) => onChange(event.target.checked)} />
                <span>
                    <span className={styles.checkboxLabel}>{labels.label}</span>
                    <span className={styles.checkboxHint}>{defaultHint}</span>
                </span>
            </label>
        );
    }

    return (
        <div className={styles.field}>
            <Input
                label={labels.label}
                hint={hint}
                error={error}
                value={text}
                inputMode={definition.type === 'string' ? undefined : 'decimal'}
                onChange={(event) => onChange(event.target.value)}
                trailing={!isDefault && (
                    <IconButton label={`Revino la valoarea implicită pentru ${labels.label}`} size="sm" onClick={onReset}>
                        <RotateCcw />
                    </IconButton>
                )}
            />
        </div>
    );
}

/**
 * Every tunable setting, grouped. Edits stay local until saved; only changed values are sent.
 * The reset button next to a field restores the default (saved immediately).
 */
export default function SettingsForm({ settings }) {
    const { values, definitions } = settings;
    const [draft, setDraft] = useState(() => Object.fromEntries(definitions.map((d) => [d.key, toText(values[d.key])])));
    const [errors, setErrors] = useState({});
    const update = useUpdateSettings();

    const byKey = useMemo(() => new Map(definitions.map((d) => [d.key, d])), [definitions]);
    const changedKeys = definitions
        .filter((definition) => draft[definition.key] !== toText(values[definition.key]))
        .map((definition) => definition.key);

    const setField = (key, text) => {
        setDraft((current) => ({ ...current, [key]: text }));
        setErrors((current) => ({ ...current, [key]: undefined }));
    };

    const resetField = (key) => {
        update.mutate({ [key]: null }, {
            onSuccess: (saved) => setField(key, toText(saved.values[key])),
        });
    };

    const save = (event) => {
        event.preventDefault();
        const changes = {};
        const nextErrors = {};
        for (const key of changedKeys) {
            const { value, error } = parseSettingInput(byKey.get(key), draft[key]);
            if (error) nextErrors[key] = error;
            else changes[key] = value;
        }
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length === 0 && Object.keys(changes).length > 0) {
            update.mutate(changes, {
                onSuccess: (saved) => setDraft(Object.fromEntries(definitions.map((d) => [d.key, toText(saved.values[d.key])]))),
            });
        }
    };

    return (
        <form className={styles.form} onSubmit={save} noValidate>
            {SETTING_GROUPS.map((group) => (
                <Card key={group.key} className={styles.group}>
                    <div className={styles.groupHeader}>
                        <h3 className={styles.groupTitle}>{group.title}</h3>
                        <p className={styles.groupDescription}>{group.description}</p>
                    </div>
                    <div className={styles.fields}>
                        {definitions.filter((definition) => definition.group === group.key).map((definition) => (
                            <SettingField
                                key={definition.key}
                                definition={definition}
                                text={draft[definition.key]}
                                savedValue={values[definition.key]}
                                error={errors[definition.key]}
                                onChange={(text) => setField(definition.key, text)}
                                onReset={() => resetField(definition.key)}
                            />
                        ))}
                    </div>
                </Card>
            ))}

            <div className={styles.saveBar}>
                <span className={styles.changes}>
                    {changedKeys.length === 0 ? 'Nicio modificare nesalvată' : `${changedKeys.length} modificări nesalvate`}
                </span>
                <Button type="submit" leftIcon={<Save />} loading={update.isPending} disabled={changedKeys.length === 0}>
                    Salvează setările
                </Button>
            </div>
        </form>
    );
}
