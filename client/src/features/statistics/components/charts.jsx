import {
    Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import styles from './charts.module.css';

/*
 * Recharts wrappers that apply the chart rules once: a single validated series colour,
 * thin marks with rounded data-ends, hairline solid grid, muted axes and a styled tooltip.
 */
const SERIES = 'var(--chart-series-1)';
const AXIS_TICK = { fill: 'var(--chart-axis)', fontSize: 12 };

function ChartTooltip({ active, payload, label, formatLabel, formatValue }) {
    if (!active || !payload?.length) return null;
    return (
        <div className={styles.tooltip}>
            <span className={styles.tooltipLabel}>{formatLabel ? formatLabel(label) : label}</span>
            <strong className={styles.tooltipValue}>{formatValue(payload[0].value)}</strong>
        </div>
    );
}

/** Ranked horizontal bars — for comparing a value across named categories. */
export function RankedBarChart({ data, valueKey, labelKey, formatValue = String, height }) {
    const chartHeight = height ?? Math.max(160, data.length * 34 + 24);
    return (
        <div style={{ height: chartHeight }}>
            <ResponsiveContainer>
                <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={6}>
                    <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
                    <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={formatValue} />
                    <YAxis type="category" dataKey={labelKey} width={170} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'var(--color-surface-sunken)' }} content={<ChartTooltip formatValue={formatValue} />} />
                    <Bar dataKey={valueKey} fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/** Vertical bars over ordered buckets (histogram). */
export function HistogramChart({ data, valueKey, labelKey, formatValue = String, formatLabel, height = 260 }) {
    return (
        <div style={{ height }}>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barCategoryGap={2}>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey={labelKey} tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'var(--color-surface-sunken)' }} content={<ChartTooltip formatValue={formatValue} formatLabel={formatLabel} />} />
                    <Bar dataKey={valueKey} fill={SERIES} radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/** Smooth area for a continuous curve (e.g. a fitted normal distribution). */
export function CurveChart({ data, xKey, yKey, formatX = String, formatY = String, height = 260 }) {
    return (
        <div style={{ height }}>
            <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
                    <defs>
                        <linearGradient id="curve-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={SERIES} stopOpacity={0.28} />
                            <stop offset="100%" stopColor={SERIES} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey={xKey} type="number" domain={['dataMin', 'dataMax']} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={formatX} />
                    <YAxis hide />
                    <Tooltip
                        cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
                        content={<ChartTooltip formatValue={formatY} formatLabel={formatX} />}
                    />
                    <Area type="monotone" dataKey={yKey} stroke={SERIES} strokeWidth={2} fill="url(#curve-fill)" activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)' }} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
