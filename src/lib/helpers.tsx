export function calculateStreak(logs: any[]) {
    if (logs.length === 0) return 0;
    const days = [...new Set(logs.map((l: any) => new Date(l.date).setHours(0,0,0,0)))].sort((a,b) => b-a);
    const today = new Date().setHours(0,0,0,0);
    const yesterday = today - 86400000;
    if (days[0] !== today && days[0] !== yesterday) return 0;
    let streak = 1;
    for (let i = 0; i < days.length - 1; i++) {
        if (days[i] - days[i+1] === 86400000) streak++;
        else break;
    }
    return streak;
}

export function saveResult(setTestResults: any, type: string, value: number) {
    setTestResults((prev: any[]) => [...prev, { id: Date.now(), date: new Date().toISOString(), type, value }]);
}
