import type { Distortion, Practice, RecordField } from './types';

export const distortions: Distortion[] = [
    {
        id: 'allornothing', name: 'All-or-nothing thinking',
        short: 'The world splits into perfect or failure, with no middle ground.',
        example: '"I didn\'t start the day as planned — so the day is already ruined."',
        question: 'What would "partly worked out" look like? What does a B look like instead of an A?',
    },
    {
        id: 'catastrophe', name: 'Catastrophizing',
        short: 'A small setback spirals into the worst-case outcome.',
        example: '"I didn\'t reply to that email in time — now they\'ll think I\'m irresponsible."',
        question: 'What is the worst thing that could actually happen? How likely is it, and could I get through it?',
    },
    {
        id: 'shoulds', name: 'Should statements',
        short: '"I should", "I ought to have" — demands that leave guilt behind them.',
        example: '"I should be getting as much done as everyone else."',
        question: 'What changes if "I should" becomes "I choose to" or "I\'d like to"?',
    },
    {
        id: 'mindreading', name: 'Mind reading',
        short: 'You\'re sure you know what someone thinks of you, with no evidence at all.',
        example: '"They replied briefly — so I must be annoying them."',
        question: 'What other explanations fit that behaviour? What do I actually know, and what did I make up?',
    },
    {
        id: 'filter', name: 'Mental filter',
        short: 'Only the bad gets noticed; the good doesn\'t count.',
        example: '"I got nine things done but forgot one — the day\'s a write-off."',
        question: 'What went well today, even something small? Why didn\'t I count it?',
    },
    {
        id: 'labeling', name: 'Labeling',
        short: 'One action turns into a verdict on who you are as a person.',
        example: '"I got distracted again — I\'m hopeless."',
        question: 'Would I say that to a friend in this situation? What would I say instead?',
    },
    {
        id: 'overgeneral', name: 'Overgeneralization',
        short: 'One instance becomes a rule: "always", "never", "every time".',
        example: '"I never manage to see things through."',
        question: 'When did it work out? Find at least three cases that contradict "never".',
    },
    {
        id: 'emotional', name: 'Emotional reasoning',
        short: 'A feeling is taken as fact: "I feel anxious, so it must be dangerous."',
        example: '"I feel stupid, so I really must not be able to handle this."',
        question: 'What facts support this feeling, and what facts contradict it?',
    },
    {
        id: 'personal', name: 'Personalization',
        short: 'You take responsibility for everything, even things that weren\'t yours.',
        example: '"The team missed the deadline — I let everyone down."',
        question: 'What other factors shaped the outcome? What part of this is really mine?',
    },
    {
        id: 'discount', name: 'Discounting the positive',
        short: 'Achievements get explained away as luck or "it wasn\'t even hard".',
        example: '"I turned the project in, but it wasn\'t anything difficult."',
        question: 'What did I specifically do to get this result? How much effort did it actually take?',
    },
];

export const practices: Practice[] = [
    {
        id: 'activation', title: 'Behavioural activation', icon: '🌱',
        why: 'During a low, it\'s tempting to wait for the mood before starting. In practice, action comes first — mood follows.',
        steps: [
            'Pick one thing that used to bring enjoyment or a sense of completion.',
            'Shrink it down to a version you\'ll definitely do even on a bad day.',
            'Set a specific time for it, not "whenever I feel like it".',
            'Afterwards, note how your state shifted on a 0–10 scale.',
        ],
    },
    {
        id: 'fiveminutes', title: 'The five-minute rule', icon: '⏱️',
        why: 'It\'s not the task the brain resists — it\'s starting it. Five minutes gets around that barrier.',
        steps: [
            'Agree with yourself to do the task for exactly 5 minutes.',
            'Set a timer and put your phone out of sight.',
            'When the timer goes off, you\'re free to honestly stop.',
            'Usually you won\'t want to stop by then — the hardest part is already behind you.',
        ],
    },
    {
        id: 'decatastrophe', title: 'Decatastrophizing', icon: '⚖️',
        why: 'Anxiety only shows the worst outcome, and hides the fact that it can be handled.',
        steps: [
            'Write down the worst thing that could happen.',
            'Write down the best thing that could happen.',
            'Write down the most likely thing — usually somewhere between the two, and closer to boring.',
            'Answer: if the worst did happen, what exactly would I do?',
        ],
    },
    {
        id: 'externalize', title: 'A brain dump', icon: '🗒️',
        why: 'Open loops occupy working memory and create background tension.',
        steps: [
            'Spend 10 minutes writing down everything on your mind — no sorting.',
            'Mark what genuinely isn\'t your responsibility, and cross it out.',
            'From what\'s left, pick three things for today.',
            'Send the rest to Kanban — it will stop resurfacing.',
        ],
    },
    {
        id: 'selfcompassion', title: 'Talk to yourself like a friend', icon: '💬',
        why: 'The inner critic rarely speeds things up — more often it paralyzes.',
        steps: [
            'Write down what you\'re telling yourself right now.',
            'Imagine a friend said this about themselves.',
            'Write what you\'d say back to them — the same words, but aimed at yourself.',
            'Compare the two versions: which one actually helps you move?',
        ],
    },
];

/** The classic thought-record columns, in the order they're worked through. */
export const recordFields: readonly RecordField[] = [
    { key: 'situation', label: 'Situation', hint: 'What happened? Facts, not judgments.' },
    { key: 'thought', label: 'Automatic thought', hint: 'What went through your mind?' },
    { key: 'emotion', label: 'Emotion', hint: 'What did you feel? One or two words.' },
    { key: 'evidenceFor', label: 'Evidence for the thought', hint: 'Facts only, not feelings.' },
    { key: 'evidenceAgainst', label: 'Evidence against it', hint: 'What does this thought leave out?' },
    { key: 'alternative', label: 'A more balanced thought', hint: 'Not "everything\'s fine" — more accurate and honest.' },
] as const;
