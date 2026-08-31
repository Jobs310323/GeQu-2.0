import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Today } from './Today';
import { useTasks } from '../../stores/tasks.store';
import { useHabits } from '../../stores/habits.store';
import { useCheckins } from '../../stores/checkins.store';
import { todayKey, addDays } from '../../lib/datetime';

/**
 * Today is the first screen and the one the rest of the product serves, so what
 * is tested here is its *editorial* rules rather than its markup:
 *
 *   - exactly ONE next action, never a list
 *   - an honest empty state instead of a manufactured insight
 *   - the habit shown is the one with the most to lose
 *
 * A dashboard that shows every metric the system holds has told the user
 * nothing (docs/PRODUCT_PRINCIPLES.md). These assertions are that principle,
 * made executable.
 */

const renderToday = () => render(<MemoryRouter><Today /></MemoryRouter>);

beforeEach(() => {
    useTasks.setState({ kanban: [] });
    useHabits.setState({ habits: [] });
    useCheckins.setState({ logs: [] });
});
afterEach(() => vi.useRealTimers());

const task = (over: Partial<{ id: number; text: string; status: string; priority: string }> = {}) => ({
    id: over.id ?? Date.now() + Math.random(),
    text: over.text ?? 'задача',
    status: over.status ?? 'todo',
    priority: over.priority ?? 'low',
}) as never;

describe('next action', () => {
    it('suggests exactly one thing, not a list', () => {
        useTasks.setState({
            kanban: [
                task({ text: 'первая', priority: 'high' }),
                task({ text: 'вторая', priority: 'high' }),
                task({ text: 'третья', priority: 'high' }),
            ],
        });
        renderToday();

        const region = screen.getByRole('region', { name: 'Дальше' });
        // Whatever it picks, only one task text may appear inside the block.
        const named = ['первая', 'вторая', 'третья'].filter(t => within(region).queryByText(new RegExp(t)));
        expect(named).toHaveLength(1);
    });

    it('prefers a task already in progress over an untouched one', () => {
        useTasks.setState({
            kanban: [
                task({ text: 'не начата', priority: 'high' }),
                task({ text: 'уже в работе', status: 'doing', priority: 'low' }),
            ],
        });
        renderToday();
        // Scoped to the next-action block: the task legitimately also appears in
        // the priorities list below, which is correct and not what is asserted.
        const region = screen.getByRole('region', { name: 'Дальше' });
        expect(within(region).getByText(/уже в работе/)).toBeInTheDocument();
        expect(within(region).queryByText(/не начата/)).not.toBeInTheDocument();
    });
});

describe('insight', () => {
    it('says there is not enough data rather than inventing a finding', () => {
        useCheckins.setState({
            logs: [{ date: new Date().toISOString(), sleep: 9, focus: 9, mood: 8, helped: [], hindered: [] }] as never,
        });
        renderToday();
        // The honest empty state, not a sentence built from one day.
        expect(screen.getByText(/мало данных/i)).toBeInTheDocument();
    });
});

describe('state strip', () => {
    it('shows a dash rather than a number before the day is closed', () => {
        renderToday();
        // Energy with no check-in is unknown, and unknown must not render as 0.0
        // — a fabricated zero reads as "you are at rock bottom".
        expect(screen.getByText(/день не закрыт/i)).toBeInTheDocument();
    });

    it('counts habits ticked today', () => {
        const t = todayKey();
        useHabits.setState({
            habits: [
                { id: 1, name: 'вода', history: [t] },
                { id: 2, name: 'зарядка', history: [] },
            ] as never,
        });
        renderToday();
        expect(screen.getByText('1/2')).toBeInTheDocument();
    });
});

describe('habit card', () => {
    it('offers the habit with the longest run still at risk', () => {
        const t = todayKey();
        useHabits.setState({
            habits: [
                { id: 1, name: 'короткая серия', history: [addDays(t, -1)] },
                { id: 2, name: 'длинная серия', history: [addDays(t, -1), addDays(t, -2), addDays(t, -3)] },
            ] as never,
        });
        renderToday();
        expect(screen.getByText('длинная серия')).toBeInTheDocument();
        expect(screen.queryByText('короткая серия')).not.toBeInTheDocument();
    });

    it('disappears once everything is done, instead of showing "0 remaining"', () => {
        const t = todayKey();
        useHabits.setState({ habits: [{ id: 1, name: 'вода', history: [t] }] as never });
        renderToday();
        expect(screen.queryByRole('button', { name: /отметить/i })).not.toBeInTheDocument();
    });

    it('ticking it from Today actually records the habit', async () => {
        const user = userEvent.setup();
        useHabits.setState({ habits: [{ id: 1, name: 'вода', history: [] }] as never });
        renderToday();

        await user.click(screen.getByRole('button', { name: /отметить/i }));
        expect(useHabits.getState().habits[0]!.history).toContain(todayKey());
    });
});
