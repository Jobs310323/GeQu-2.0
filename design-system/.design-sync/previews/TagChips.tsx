import { useState } from 'react';
import { TagChips } from '@gequ/design-system';

/** A goal/step with a few tags already attached, plus the inline "+ тег" affordance. */
export function WithTags() {
    const [tags, setTags] = useState(['спорт', 'здоровье', 'утро']);
    return <TagChips tags={tags} onChange={setTags} />;
}

/** Empty state — just the add affordance. */
export function Empty() {
    const [tags, setTags] = useState<string[]>([]);
    return <TagChips tags={tags} onChange={setTags} />;
}
