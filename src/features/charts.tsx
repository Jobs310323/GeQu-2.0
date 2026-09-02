import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Chart from 'chart.js/auto';
import type { ChartOptions, TooltipItem } from 'chart.js';
import type { DayLog, TestResult } from '../types/domain';
import { formatDate } from '../lib/format';

/** The three self-rated numbers a day log carries. */
type DayMetric = 'sleep' | 'focus' | 'mood';

/**
 * Categorical series palette.
 *
 * Validated with the dataviz palette checker against BOTH the light and dark
 * chart surfaces — all six checks pass in both modes (worst adjacent pair:
 * ΔE 23.4 under protanopia, 33.3 for normal vision, both well over the floors).
 * The app's own accent trio (cyan/purple/pink) FAILED: purple↔pink sat at
 * ΔE 13.1 for normal vision, under the hard floor of 15.
 *
 * Assign these in fixed order — never cycle, never reorder per filter.
 */
export const SERIES = ['#0284C7', '#EA580C', '#7C3AED'] as const;

/** Tracks the `light`/`dark` class the theme toggle stamps on <html>. */
function useThemeTick() {
    const [isLight, setIsLight] = useState(() => document.documentElement.classList.contains('light'));
    useEffect(() => {
        const obs = new MutationObserver(() =>
            setIsLight(document.documentElement.classList.contains('light')));
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);
    return isLight;
}

function baseOptions(isLight: boolean, yMin?: number, yMax?: number) {
    const ink = isLight ? '#4A4A55' : '#8892B0';
    const grid = isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)';
    return {
        responsive: true,
        maintainAspectRatio: false,
        // Crosshair-style shared tooltip: hovering anywhere on the plot reports
        // every series at that date, not just the nearest point.
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
            legend: {
                display: true,
                position: 'bottom' as const,
                labels: { color: ink, usePointStyle: true, pointStyle: 'circle' as const, boxWidth: 8, padding: 16 },
            },
            tooltip: {
                backgroundColor: isLight ? 'rgba(255,255,255,0.97)' : 'rgba(20,20,35,0.97)',
                titleColor: isLight ? '#1E1E24' : '#E0E6ED',
                bodyColor: isLight ? '#2A2A32' : '#E0E6ED',
                borderColor: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.14)',
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8,
                usePointStyle: true,
                displayColors: true,
            },
        },
        scales: {
            x: { grid: { display: false }, border: { color: grid }, ticks: { color: ink, maxRotation: 0, autoSkipPadding: 16 } },
            y: {
                min: yMin, max: yMax,
                grid: { color: grid, drawTicks: false },
                border: { display: false },
                ticks: { color: ink, padding: 8 },
            },
        },
    };
}

/** Soft vertical gradient under a line, so fills read as depth not as blocks. */
function fillGradient(ctx: CanvasRenderingContext2D, area: { top: number; bottom: number }, hex: string) {
    if (!area) return 'transparent';
    const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, hex + '40');
    g.addColorStop(1, hex + '00');
    return g;
}

const lineStyle = (hex: string, label: string, fill: boolean) => ({
    label,
    borderColor: hex,
    borderWidth: 2,
    tension: 0.35,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBorderWidth: 2,
    pointHoverBackgroundColor: hex,
    pointHoverBorderColor: '#fff',
    fill,
});

/** Sleep / focus / mood over time — three categorical series on one 0–10 axis. */
export function StateChart({ logs }: { logs: DayLog[] }) {
    const { t } = useTranslation('insights');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);
    const isLight = useThemeTick();

    useEffect(() => {
        const el = canvasRef.current;
        if (!el) return;
        chartRef.current?.destroy();

        const series: { key: DayMetric; label: string; color: string }[] = [
            { key: 'sleep', label: t('insights:dynamics.metric.sleep'), color: SERIES[0] },
            { key: 'focus', label: t('insights:dynamics.metric.focus'), color: SERIES[1] },
            { key: 'mood', label: t('insights:dynamics.metric.mood'), color: SERIES[2] },
        ];

        chartRef.current = new Chart(el, {
            type: 'line',
            data: {
                labels: logs.map((l) => formatDate(l.date, 'dayMonth')),
                // Three overlapping translucent fills turn to mud, so this chart
                // is lines only — the single-series TestChart keeps its fill.
                datasets: series.map(s => ({
                    ...lineStyle(s.color, s.label, false),
                    data: logs.map((l) => (Number.isFinite(Number(l[s.key])) ? Number(l[s.key]) : null)),
                    spanGaps: true,
                })),
            },
            options: baseOptions(isLight, 0, 10) as ChartOptions<'line'>,
        });

        return () => { chartRef.current?.destroy(); chartRef.current = null; };
    }, [logs, isLight, t]);

    return <canvas ref={canvasRef} />;
}

/** A single cognitive test over time. One series, so no legend box is needed. */
export function TestChart({ results, label, lowerIsBetter }: { results: TestResult[]; label: string; lowerIsBetter: boolean }) {
    const { t } = useTranslation('insights');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);
    const isLight = useThemeTick();
    const resolvedLabel = label ?? t('insights:chart.resultLabel');

    useEffect(() => {
        const el = canvasRef.current;
        if (!el) return;
        chartRef.current?.destroy();

        const color = SERIES[0];
        const base = baseOptions(isLight);
        const opts: ChartOptions<'line'> = {
            ...base,
            plugins: {
                ...base.plugins,
                // The title already names the single series.
                legend: { display: false },
                tooltip: {
                    ...base.plugins?.tooltip,
                    callbacks: {
                        label: (item: TooltipItem<'line'>) =>
                            `${resolvedLabel}: ${item.parsed.y}${lowerIsBetter ? t('insights:chart.lowerIsBetterSuffix') : ''}`,
                    },
                },
            },
        };

        chartRef.current = new Chart(el, {
            type: 'line',
            data: {
                labels: results.map((r) => formatDate(r.date, 'dayMonth')),
                datasets: [{
                    ...lineStyle(color, resolvedLabel, true),
                    data: results.map((r) => Number(r.value)),
                    backgroundColor: (c) => fillGradient(c.chart.ctx, c.chart.chartArea, color),
                }],
            },
            options: opts,
        });

        return () => { chartRef.current?.destroy(); chartRef.current = null; };
    }, [results, isLight, resolvedLabel, lowerIsBetter, t]);

    return <canvas ref={canvasRef} />;
}
