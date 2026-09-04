// GeQu design system — the "GeQu-Checkin-MyCard" visual language as a
// standalone, buildable component package. Everything here either
// re-exports a component that already lives in the app (reexports.ts) or
// wraps the app's own CSS classes (gq-*, glass-card) in a typed component —
// nothing is a reimplementation of something that already existed as a
// reusable module. See design-system/README.md (generated) for the full
// catalog, and the app's src/components/ for anything not listed here that
// stayed page-specific (MindMap nodes, calendar cells, chart wrappers,
// Gym's set-editor grid) — those are one-off enough that formalizing them
// would cost more than it returns; see .design-sync/NOTES.md.
import './styles.css';

export * from './reexports';

export { Button } from './components/Button';
export { Card } from './components/Card';
export { Chip } from './components/Chip';
export { IconBadge } from './components/IconBadge';
export { ProgressBar } from './components/ProgressBar';
export { TabStrip } from './components/TabStrip';
export type { TabStripItem } from './components/TabStrip';
export { StatTile } from './components/StatTile';
export { Modal } from './components/Modal';
export { ListItemRow } from './components/ListItemRow';
export { EmptyState } from './components/EmptyState';
export { AlertBanner } from './components/AlertBanner';
export { Toast } from './components/Toast';
export { Input, Textarea, Select } from './components/Input';
export { Slider } from './components/Slider';
export { Checkbox } from './components/Checkbox';
export { Divider, Row } from './components/Divider';
export { Heading } from './components/Heading';
export { PageShell } from './components/PageShell';
export { Collapsible } from './components/Collapsible';
export { NavItem, NavGroup, NavRailGlyph } from './components/Nav';
