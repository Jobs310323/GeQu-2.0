import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export function TestChart({ results }: any) {
    const chartRef = useRef<any>(null);
    useEffect(() => {
        if (chartRef.current) {
            if (chartRef.current._chart) chartRef.current._chart.destroy();
            chartRef.current._chart = new Chart(chartRef.current, {
                type: 'line', 
                data: { 
                    labels: results.map((r:any) => new Date(r.date).toLocaleDateString('ru-RU', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})), 
                    datasets: [{ label: 'Результат', data: results.map((r:any) => r.value), borderColor: '#FF79C6', backgroundColor: 'rgba(255, 121, 198, 0.1)', tension: 0.4, fill: true }] 
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
            });
        }
    }, [results]);
    return <canvas ref={chartRef}></canvas>;
}

export function BigChart({ logs }: any) {
    const chartRef = useRef<any>(null);
    useEffect(() => {
        if (chartRef.current) {
            if (chartRef.current._chart) chartRef.current._chart.destroy();
            chartRef.current._chart = new Chart(chartRef.current, {
                type: 'line', data: { labels: logs.map((l:any) => new Date(l.date).toLocaleDateString('ru-RU', {day: 'numeric', month: 'short'})), datasets: [{ label: 'Сон', data: logs.map((l:any) => l.sleep), borderColor: '#BD93F9', tension: 0.4, fill: true }, { label: 'Фокус', data: logs.map((l:any) => l.focus), borderColor: '#64FFDA', tension: 0.4, fill: true }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { max: 10, min: 0 } } }
            });
        }
    }, [logs]);
    return <canvas ref={chartRef}></canvas>;
}

export function MiniChart({ logs }: any) {
    const chartRef = useRef<any>(null);
    useEffect(() => {
        if (chartRef.current) {
            if (chartRef.current._chart) chartRef.current._chart.destroy();
            chartRef.current._chart = new Chart(chartRef.current, {
                type: 'line', data: { labels: logs.map((l:any) => new Date(l.date).toLocaleDateString('ru-RU', {day: 'numeric', month: 'short'})), datasets: [{ label: 'Фокус', data: logs.map((l:any) => l.focus), borderColor: '#64FFDA', tension: 0.4, fill: true }] },
                options: { plugins: { legend: { display: false } }, scales: { y: { max: 10, min: 0 } } }
            });
        }
    }, [logs]);
    return <canvas ref={chartRef}></canvas>;
}

export function SchulteChart({ results }: any) {
    const chartRef = useRef<any>(null);
    useEffect(() => {
        if (chartRef.current) {
            if (chartRef.current._chart) chartRef.current._chart.destroy();
            chartRef.current._chart = new Chart(chartRef.current, {
                type: 'line', data: { labels: results.map((r:any) => new Date(r.date).toLocaleString('ru-RU', {hour: '2-digit', minute: '2-digit'})), datasets: [{ label: 'Время (сек)', data: results.map((r:any) => r.time), borderColor: '#FF79C6', tension: 0.4, fill: true }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
            });
        }
    }, [results]);
    return <canvas ref={chartRef}></canvas>;
}
