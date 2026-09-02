import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';

type Props = {
    text: string;
    collapsedHeight?: number;
    className?: string;
};

export function CollapsibleMarkdown({ text, collapsedHeight = 160, className = '' }: Props) {
    const { t } = useTranslation('common');
    const contentRef = useRef<HTMLDivElement>(null);
    const [overflows, setOverflows] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useLayoutEffect(() => {
        const el = contentRef.current;
        if (!el) return;
        setOverflows(el.scrollHeight > collapsedHeight + 4);
    }, [text, collapsedHeight]);

    return (
        <div className={className}>
            <div
                className="relative overflow-hidden"
                style={{ maxHeight: expanded || !overflows ? undefined : collapsedHeight }}
            >
                <div ref={contentRef} className="markdown-content text-sm text-[var(--text-main)]"
                    dangerouslySetInnerHTML={{ __html: marked.parse(text || '', { async: false }) as string }} />
                {!expanded && overflows && (
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10"
                        style={{ background: 'linear-gradient(to bottom, transparent, var(--bg-card))' }} />
                )}
            </div>
            {overflows && (
                <button type="button" onClick={() => setExpanded(e => !e)}
                    className="mt-1.5 text-xs text-[var(--accent-cyan)] hover:underline">
                    {expanded ? t('common:markdown.collapse') : t('common:markdown.expand')}
                </button>
            )}
        </div>
    );
}

export function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
}
