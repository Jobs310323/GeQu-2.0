import { useState } from 'react';

function move<T>(arr: T[], from: number, to: number): T[] {
    const next = [...arr];
    const [item] = next.splice(from, 1);
    // Out-of-range index: nothing was removed, so there is nothing to reinsert.
    if (item === undefined) return arr;
    next.splice(to, 0, item);
    return next;
}

/**
 * Pointer drag-and-drop reordering for a list.
 *
 * Dragging is armed by pressing a handle rather than the whole row, so the
 * checkboxes, inputs and buttons inside a row stay clickable. Every handler
 * stops propagation so a nested list (steps inside a goal) does not also
 * reorder the outer one.
 */
export function useDragReorder<T>(items: T[], onReorder: (next: T[]) => void) {
    const [armed, setArmed] = useState(false);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);

    const reset = () => { setArmed(false); setDragIndex(null); setOverIndex(null); };

    const handleProps = {
        onPointerDown: () => setArmed(true),
        onPointerUp: () => setArmed(false),
        style: { cursor: 'grab' as const, touchAction: 'none' as const },
    };

    const itemProps = (index: number) => ({
        draggable: armed,
        onDragStart: (e: React.DragEvent) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = 'move';
            setDragIndex(index);
        },
        onDragOver: (e: React.DragEvent) => {
            if (dragIndex === null) return;
            e.preventDefault();
            e.stopPropagation();
            if (index !== overIndex) setOverIndex(index);
        },
        onDrop: (e: React.DragEvent) => {
            if (dragIndex === null) return;
            e.preventDefault();
            e.stopPropagation();
            if (dragIndex !== index) onReorder(move(items, dragIndex, index));
            reset();
        },
        onDragEnd: (e: React.DragEvent) => { e.stopPropagation(); reset(); },
    });

    /** Extra classes for the row being dragged and the row it would land on. */
    const itemClass = (index: number) =>
        [
            dragIndex === index ? 'opacity-40' : '',
            overIndex === index && dragIndex !== index ? 'ring-1 ring-cyan-400/60' : '',
        ].filter(Boolean).join(' ');

    return { handleProps, itemProps, itemClass, dragging: dragIndex !== null };
}
