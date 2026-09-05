import { useState } from 'react';
import { Checkbox } from '@gequ/design-system';

/** Default variant: native checkbox, both states. */
export function Default() {
    const [checked, setChecked] = useState(true);
    return (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Checkbox checked={checked} onChange={setChecked} />
            <Checkbox checked={!checked} onChange={() => {}} />
        </div>
    );
}

/** Circle variant: the big habit-tick used on the Habits page, checked and unchecked. */
export function Circle() {
    const [checked, setChecked] = useState(true);
    return (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Checkbox variant="circle" checked={checked} onChange={setChecked} />
            <Checkbox variant="circle" checked={!checked} onChange={() => {}} />
            <Checkbox variant="circle" checked={false} disabled onChange={() => {}} />
        </div>
    );
}
