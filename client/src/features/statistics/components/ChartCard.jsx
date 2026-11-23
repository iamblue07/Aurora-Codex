import { Card } from '@/shared/ui';
import styles from './ChartCard.module.css';

/**
 * Chart container: title, description, the chart, and an expandable data table so every value
 * is readable without relying on hover tooltips or colour (accessibility).
 * `table`: { columns: string[], rows: (string|number)[][] }
 */
export default function ChartCard({ title, description, actions, table, children, className }) {
    return (
        <Card as="section" className={className}>
            <header className={styles.header}>
                <div>
                    <h2 className={styles.title}>{title}</h2>
                    {description && <p className={styles.description}>{description}</p>}
                </div>
                {actions}
            </header>
            <div className={styles.chart}>{children}</div>
            {table && table.rows.length > 0 && (
                <details className={styles.details}>
                    <summary>Vezi datele în tabel</summary>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>{table.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr>
                            </thead>
                            <tbody>
                                {table.rows.map((row, index) => (
                                    <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </details>
            )}
        </Card>
    );
}
