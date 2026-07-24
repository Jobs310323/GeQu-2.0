export function Settings({ diary, logs }: any) {
    const exportTxt = () => { 
        let text = "=== Дневник GeQu ===\n\n"; 
        diary.forEach((d:any) => { text += `${new Date(d.date).toLocaleString('ru-RU')}\n${d.content}\n--------------------\n\n`; }); 
        downloadFile(text, "gequ_diary.txt", "text/plain"); 
    };
    
    const exportCsv = () => { 
        let csv = "Дата,Сон,Фокус,Настроение,Помогло,Мешало,Событие\n"; 
        logs.forEach((l:any) => { 
            const helped = l.helped ? l.helped.join('; ') : '';
            const hindered = l.hindered ? l.hindered.join('; ') : '';
            csv += `${new Date(l.date).toLocaleString('ru-RU')},${l.sleep},${l.focus},${l.mood},"${helped}","${hindered}","${l.mainEvent || ''}"\n`; 
        }); 
        downloadFile(csv, "gequ_logs.csv", "text/csv;charset=utf-8;"); 
    };
    
    const downloadFile = (content: string, fileName: string, mimeType: string) => { 
        const blob = new Blob([content], { type: mimeType }); 
        const url = URL.createObjectURL(blob); 
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = fileName; 
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a); 
        URL.revokeObjectURL(url); 
    };

    const exportAllData = () => {
        const backup: any = {};
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('gequ_')) {
                backup[key] = localStorage.getItem(key);
            }
        });
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gequ_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const importAllData = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                Object.keys(data).forEach(key => {
                    if (key.startsWith('gequ_')) {
                        localStorage.setItem(key, data[key]);
                    }
                });
                alert("Данные успешно загружены! Страница будет перезагружена.");
                window.location.reload();
            } catch {
                alert("Ошибка чтения файла. Убедитесь, что это резервная копия GeQu.");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Настройки и данные</h1>
            
            <div className="glass-card p-6 rounded-2xl mb-6 border border-cyan-400/30 bg-cyan-400/5">
                <h2 className="text-xl mb-2 text-cyan-400">Резервное копирование (Всё приложение)</h2>
                <p className="text-gray-400 mb-4 text-sm">Сохраните все данные (Дневник, Тесты, Спортзал, Привычки) в один файл или загрузите из файла для переноса на другое устройство.</p>
                <div className="flex gap-4 flex-wrap">
                    <button onClick={exportAllData} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg">Выгрузить всё (JSON)</button>
                    <label className="bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold px-6 py-3 rounded-lg cursor-pointer">
                        Загрузить из файла
                        <input type="file" accept=".json" onChange={importAllData} className="hidden" />
                    </label>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-xl mb-4">Экспорт отдельных данных</h2>
                <div className="flex gap-4 flex-wrap">
                    <button onClick={exportTxt} className="bg-white/5 text-white font-bold px-6 py-3 rounded-lg border border-[var(--border)]">Дневник (.txt)</button>
                    <button onClick={exportCsv} className="bg-white/5 text-white font-bold px-6 py-3 rounded-lg border border-[var(--border)]">Логи дней (.csv)</button>
                </div>
            </div>
        </div>
    );
}
