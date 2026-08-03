// Minimal self-contained SVG icon set (no external icon lib dependency).
type IconProps = { size?: number; className?: string };

const paths: Record<string, string> = {
    grid: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z',
    calendar: 'M7 2v3M17 2v3M3 8h18M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
    repeat: 'M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
    columns: 'M4 4h16v16H4zM10 4v16M16 4v16',
    flag: 'M5 3v18M5 4h11l-2 4 2 4H5',
    book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z M20 17v3H6.5A2.5 2.5 0 0 1 4 17.5',
    pin: 'M12 2a6 6 0 0 0-6 6c0 5 6 12 6 12s6-7 6-12a6 6 0 0 0-6-6zM12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    thought: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.4.3.5.7.5 1.1v.5h6v-.5c0-.4.1-.8.5-1.1A6 6 0 0 0 12 3z',
    clipboard: 'M9 2h6a1 1 0 0 1 1 1v1h1.5A1.5 1.5 0 0 1 19 5.5v15a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20.5v-15A1.5 1.5 0 0 1 6.5 4H8V3a1 1 0 0 1 1-1z M9 12h6M9 16h6',
    dumbbell: 'M6.5 6.5l11 11M4 9l3-3 2 2-3 3-2-2zM15 18l3-3 2 2-3 3-2-2zM7 14l7-7',
    wallet: 'M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z M17 12h2v3h-2a1.5 1.5 0 0 1 0-3z',
    trophy: 'M7 4h10v4a5 5 0 0 1-5 5 5 5 0 0 1-5-5V4z M4 5h3v2a3 3 0 0 1-3 3zM20 5h-3v2a3 3 0 0 0 3 3zM12 13v4M8 21h8M9 17h6v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2z',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    plus: 'M12 5v14M5 12h14',
    chevronLeft: 'M15 18l-6-6 6-6',
    chevronRight: 'M9 18l6-6-6-6',
    sun: 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
};

export function Icon({ name, size = 18, className = '' }: { name: keyof typeof paths | string } & IconProps) {
    const d = paths[name];
    if (!d) return null;
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d={d} />
        </svg>
    );
}
