import type { Category } from './types';

export const categories: Category[] = [
    { id: 'basics', title: 'Как это устроено', icon: '🔬', blurb: 'Что происходит в голове и почему «просто соберись» не работает' },
    { id: 'focus', title: 'Фокус и старт', icon: '🎯', blurb: 'Как начинать и не терять нить' },
    { id: 'time', title: 'Время и планы', icon: '⏳', blurb: 'Планирование, которое переживает контакт с реальностью' },
    { id: 'emotions', title: 'Эмоции', icon: '🌊', blurb: 'Импульсивность, чувствительность к критике, выгорание' },
    { id: 'body', title: 'Тело и сон', icon: '🌙', blurb: 'Сон, движение, еда — самые сильные рычаги' },
    { id: 'life', title: 'Быт и люди', icon: '🏠', blurb: 'Дом, деньги, отношения' },
];
