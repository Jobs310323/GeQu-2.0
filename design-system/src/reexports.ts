// Components that already exist as standalone, presentational modules in the
// app (src/components/*.tsx) — re-exported verbatim rather than duplicated.
// Per the design-sync skill's own rule: "ship what the customer already
// built", never a reimplementation. Editing the app's file is what changes
// these; this file only points at it.
export { Icon, NAV_ICON } from '../../src/components/Icons';
export { PageHeader } from '../../src/components/PageHeader';
export { BentoCard } from '../../src/components/BentoCard';
export { RadialGauge } from '../../src/components/RadialGauge';
export { TagPill } from '../../src/components/TagPill';
export { TagChips } from '../../src/components/TagChips';
export { GqTabs, GqPageHead } from '../../src/components/GqTabs';
export { CollapsibleMarkdown, autoGrow } from '../../src/components/CollapsibleMarkdown';
