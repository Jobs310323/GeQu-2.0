import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { BRAINIQ_TEST_LABELS, type BrainIqTestId, type BrainIqResult } from '../features/brainiq/types';
import { RavenTest } from '../features/brainiq/raven/RavenTest';
import { RavltTest } from '../features/brainiq/ravlt/RavltTest';
import { DigitSpanTest } from '../features/brainiq/digitspan/DigitSpanTest';
import { SdmtTest } from '../features/brainiq/sdmt/SdmtTest';
import { StroopTest } from '../features/brainiq/stroop/StroopTest';

const TABS: { id: BrainIqTestId; label: string }[] = [
    { id: 'raven', label: BRAINIQ_TEST_LABELS.raven },
    { id: 'ravlt', label: BRAINIQ_TEST_LABELS.ravlt },
    { id: 'digitspan', label: BRAINIQ_TEST_LABELS.digitspan },
    { id: 'sdmt', label: BRAINIQ_TEST_LABELS.sdmt },
    { id: 'stroop', label: BRAINIQ_TEST_LABELS.stroop },
];

function LastResults({ testResults }: { testResults: BrainIqResult[] }) {
    const latestByTest = TABS.map(t => {
        const list = testResults.filter(r => r.testId === t.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { ...t, last: list[0] };
    }).filter(t => t.last);
    if (latestByTest.length === 0) return null;

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    return (
        <div className="gq-glass p-4 rounded-2xl mb-6">
            <div className="text-sm gq-muted mb-3">Последние результаты</div>
            <div className="flex flex-wrap gap-2">
                {latestByTest.map(t => (
                    <span key={t.id} className="text-xs px-2.5 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border)]">
                        {t.label}
                        {t.last!.scaled?.iq ? <> · IQ ≈ {t.last!.scaled.iq}</> : null}
                        <span className="gq-muted"> · {fmtDate(t.last!.date)}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

export function BrainIq({ brainIqResults, setBrainIqResults }: any) {
    const [tab, setTab] = useState<BrainIqTestId>('raven');

    return (
        <div>
            <PageHeader page="brainiq" title="Мозг и IQ" subtitle="Пять психометрических тестов: интеллект, память, внимание, скорость обработки" />
            <div className="gq-glass rounded-2xl p-1.5 mb-6 flex gap-1 flex-wrap">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-sm transition ${tab === t.id ? 'bg-cyan-400/10 text-cyan-400' : 'gq-muted hover:bg-white/5 hover:text-[var(--text-main)]'}`}>
                        {t.label}
                    </button>
                ))}
            </div>
            <LastResults testResults={brainIqResults} />
            {tab === 'raven' && <RavenTest setBrainIqResults={setBrainIqResults} />}
            {tab === 'ravlt' && <RavltTest setBrainIqResults={setBrainIqResults} />}
            {tab === 'digitspan' && <DigitSpanTest setBrainIqResults={setBrainIqResults} />}
            {tab === 'sdmt' && <SdmtTest setBrainIqResults={setBrainIqResults} />}
            {tab === 'stroop' && <StroopTest setBrainIqResults={setBrainIqResults} />}
        </div>
    );
}
