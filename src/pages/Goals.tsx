import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';
import { normalizeGoal } from '../lib/taskTree';
import { GoalsList } from './goals/GoalsList';
import type { Goal } from '../types/goals';

type GoalsProps = {
    goals: Goal[];
    setGoals: (goals: Goal[]) => void;
};

export function Goals({ goals, setGoals }: GoalsProps) {
    const { t } = useTranslation('plan');
    const normalizedGoals = useMemo(() => goals.map(normalizeGoal), [goals]);

    return (
        <div>
            <PageHeader page="goals" title={t('plan:goals.pageTitle')} />
            <GoalsList goals={normalizedGoals} setGoals={setGoals} />
        </div>
    );
}
