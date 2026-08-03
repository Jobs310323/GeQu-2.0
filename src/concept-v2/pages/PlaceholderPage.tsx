export function PlaceholderPage({ title }: { title: string }) {
    return (
        <div className="h-full flex items-center justify-center">
            <div className="text-center">
                <div className="text-2xl font-semibold text-white mb-1">{title}</div>
                <div className="text-sm text-slate-500">Экран концепта пока не проработан — в фокусе дашборд.</div>
            </div>
        </div>
    );
}
