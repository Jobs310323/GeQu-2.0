/**
 * Shown while a route's chunk is in flight.
 *
 * Deliberately minimal rather than a skeleton of the page: the chunks are small
 * and usually resolve in well under a frame, so a detailed skeleton would flash
 * more than it would reassure. Real per-feature skeletons belong where they earn
 * their keep — screens with slow data, not screens with a fast import.
 */
export function RouteFallback() {
    return (
        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] p-2" aria-live="polite">
            <span
                className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin motion-reduce:animate-none"
                aria-hidden="true"
            />
            Загрузка…
        </div>
    );
}
