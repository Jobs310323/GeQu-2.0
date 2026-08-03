// Minimal self-contained SVG icon set for the sidebar nav — no external icon
// library dependency, single-color strokes that inherit currentColor.
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
    idcard: 'M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-13z M8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 17c.5-2 1.8-3 3-3s2.5 1 3 3M14 8h5M14 12h5M14 16h3',
    sparkle: 'M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z',
    target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    circle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    library: 'M4 20V4h3v16H4zM10 20V4h3v16h-3zM16.2 4.4l3.6 15.4-2.9.7L13.3 5.1l2.9-.7z',
    info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v6M12 7.5h.01',
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3',
    tag: 'M20.6 13.4L13.4 20.6a2 2 0 0 1-2.8 0L3.4 13.4a2 2 0 0 1 0-2.8L10.6 3.4A2 2 0 0 1 12 2.8H19a2 2 0 0 1 2 2v6.8a2 2 0 0 1-.4 1.4zM8 8h.01',
    heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z',
    flame: 'M12 2s5 5 5 10.5a5 5 0 0 1-10 0C7 9.5 9 6.5 9.5 5c.4 1.3.9 2 1.5 2 .9 0 1.2-1.2.8-2.3C11.4 3.4 12 2 12 2z',
    rocket: 'M14.5 9.5c2-2 5-2.5 6.5-2.5-.2 3.5-1.3 6.2-3.2 8.1l-3.3 3.3-4-4 3.3-3.3a9 9 0 0 1 .7-1.6zM11.3 15.7L8.3 12.7 4 17l4.3 4.3zM7 15l-3 3M9 17l-3 3',
    flask: 'M9 2h6M10 2v6.5l-5.5 9.8A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.7L14 8.5V2',
    chevronDown: 'M6 9l6 6 6-6',
    close: 'M18 6L6 18M6 6l12 12',
    edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
    trash: 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6h14z',
    pause: 'M8 5v14M16 5v14',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2',
    bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9zM10.3 21a1.94 1.94 0 0 0 3.4 0',
    check: 'M20 6L9 17l-5-5',
    star: 'M11.525 2.3a.53.53 0 0 1 .95 0l2.31 4.68c.28.57.83.97 1.46 1.05l5.17.76a.53.53 0 0 1 .29.9l-3.73 3.64c-.46.44-.67 1.09-.56 1.72l.88 5.14a.53.53 0 0 1-.77.56l-4.62-2.43a2.12 2.12 0 0 0-1.98 0l-4.62 2.43a.53.53 0 0 1-.77-.56l.88-5.14a2.12 2.12 0 0 0-.61-1.72l-3.73-3.64a.53.53 0 0 1 .29-.9l5.17-.76a2.12 2.12 0 0 0 1.6-1.16z',
    download: 'M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3M7 10l5 5 5-5M12 15V3',
    alertTriangle: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
    lock: 'M6 10V7a6 6 0 0 1 12 0v3 M5 10h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z M12 14v3',
    trendUp: 'M1 18l7.5-7.5 5 5L23 6 M17 6h6v6',
    trendDown: 'M1 6l7.5 7.5 5-5L23 18 M17 18h6v-6',
    swap: 'M4 8h13l-3-3 M4 8l3 3 M20 16H7l3 3 M20 16l-3-3',
    grip: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
    dice: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01',
    note: 'M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z M8 8h8M8 12h5',
    activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
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

/** Maps a nav item id (see lib/nav.ts) to its sidebar icon. */
export const NAV_ICON: Record<string, string> = {
    card: 'idcard',
    dashboard: 'grid',
    aiplan: 'sparkle',
    calendar: 'calendar',
    habits: 'repeat',
    kanban: 'columns',
    goals: 'flag',
    diary: 'book',
    notes: 'pin',
    finance: 'wallet',
    gym: 'dumbbell',
    training: 'target',
    circles: 'circle',
    cbt: 'thought',
    clinical: 'clipboard',
    progress: 'trophy',
    dynamics: 'chart',
    hub: 'grid',
    knowledge: 'library',
    about: 'info',
    settings: 'settings',
};
