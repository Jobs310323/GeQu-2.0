import { useState } from 'react';

export function Knowledge() {
    const articles = [
        { id: 1, tag: 'Быт', title: 'Правило 2 минут', content: 'Если задача занимает меньше 2 минут (ответить на сообщение, помыть чашку) — сделай её прямо сейчас. Это предотвращает накопление микро-задач, которые перегружают рабочую память.' },
        { id: 2, tag: 'Работа', title: 'Тайм-блокинг вместо списка дел', content: 'Людям с СДВГ сложно оценивать время. Вместо списка "что сделать", выделяй в календаре конкретные блоки времени на задачи. "С 14:00 до 15:00 я пишу отчет", а не просто "Написать отчет".' },
        { id: 3, tag: 'Медицина', title: 'Дофамин и СДВГ', content: 'При СДВГ уровень дофамина нестабилен. Мозг ищет быструю стимуляцию (соцсети, сладкое). Заменяйте дешевый дофамин на качественный: спорт, обучение новому, сложные задачи, которые вызывают интерес.' },
        { id: 4, tag: 'Фокус', title: 'Внешний мозг', content: 'Не держи мысли в голове. Записывай всё: в GeQu, в блокнот, на стикеры. Голова человека с СДВГ — это место для создания идей, а не для их хранения.' },
        { id: 5, tag: 'Быт', title: 'Сенсорная перегрузка', content: 'Если чувствуешь, что закипаешь от звуков/света/мыслей — это перегрузка. Уйди в темное тихое место на 10 минут. Закрой глаза. Это не лень, это перезагрузка нервной системы.' },
        { id: 6, tag: 'Работа', title: 'Правило 5 минут', content: 'Договоритесь с собой поработать над задачей всего 5 минут. Часто этого хватает, чтобы преодолеть барьер старта (сопротивление дофаминовой системы).' },
        { id: 7, tag: 'Фокус', title: 'Pomodoro для СДВГ', content: 'Классический таймер 25/5 работает не для всех. Если вам нужно больше времени для разгона, попробуйте 45/15. Главное — физический таймер, который возвращает в реальность из гиперфокуса.' },
        { id: 8, tag: 'Медицина', title: 'Эмоциональная дисрегуляция', content: 'RSD (Rejection Sensitive Dysphoria) — крайняя чувствительность к отвержению или критике. Это физиологическая особенность СДВГ. Знание этого помогает не винить себя за резкие эмоции.' }
    ];
    const [filter, setFilter] = useState('Все');
    const [search, setSearch] = useState('');
    const [openId, setOpenId] = useState<number | null>(null);
    const tags = ['Все', 'Быт', 'Работа', 'Медицина', 'Фокус'];

    const filtered = articles.filter(a => (filter === 'Все' || a.tag === filter) && (a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase())));

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">База знаний</h1>
            <div className="glass-card p-6 rounded-2xl mb-6">
                <input type="text" placeholder="Поиск по статьям..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-3 outline-none focus:border-cyan-400 mb-4" />
                <div className="flex gap-2 flex-wrap">
                    {tags.map(t => <button key={t} onClick={() => setFilter(t)} className={`px-4 py-1 rounded-full text-sm transition ${filter === t ? 'bg-purple-400 text-black font-bold' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{t}</button>)}
                </div>
            </div>
            <div className="space-y-4">
                {filtered.map(art => (
                    <div key={art.id} className="glass-card rounded-2xl overflow-hidden">
                        <div onClick={() => setOpenId(openId === art.id ? null : art.id)} className="p-6 cursor-pointer flex justify-between items-center hover:bg-white/5 transition">
                            <div>
                                <span className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded mr-3">{art.tag}</span>
                                <span className="text-xl text-white">{art.title}</span>
                            </div>
                            <span className="text-gray-500">{openId === art.id ? '▲' : '▼'}</span>
                        </div>
                        {openId === art.id && (
                            <div className="px-6 pb-6 text-gray-300 leading-relaxed border-t border-[var(--border)] pt-4">
                                {art.content}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
