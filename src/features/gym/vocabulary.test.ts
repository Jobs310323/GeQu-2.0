import { describe, it, expect } from 'vitest';
import { i18next } from '../../i18n';
import { SUPPORTED_LOCALES } from '../../i18n/locale';
import {
    MUSCLE_IDS, INTENSITY_IDS, CARDIO_MUSCLE, DEFAULT_INTENSITY, ALL_FILTER,
    muscleLabel, intensityLabel,
} from './vocabulary';

/**
 * The point of these tests is that the STORED values never change.
 *
 * Every workout in every existing install carries these exact strings, the
 * records screen groups by them with `===`, and the cloud snapshot round-trips
 * them. A well-meaning translation of the arrays would silently orphan every
 * exercise a user has ever logged, and nothing about the app would look broken
 * until they opened their records and found them empty.
 */

const t = (key: string) => i18next.getFixedT('en')(key) as unknown as string;

describe('stored ids', () => {
    it('are exactly the strings already written to every user record', () => {
        expect(MUSCLE_IDS).toEqual(['Грудь', 'Спина', 'Ноги', 'Плечи', 'Руки', 'Пресс', 'Всё тело']);
        expect(INTENSITY_IDS).toEqual(['Низкая', 'Средняя', 'Высокая', 'Интервалы']);
        expect(CARDIO_MUSCLE).toBe('Кардио');
        expect(DEFAULT_INTENSITY).toBe('Средняя');
    });
});

describe('display', () => {
    it('translates a known id', () => {
        expect(muscleLabel('Грудь', t)).toBe('Chest');
        expect(muscleLabel(CARDIO_MUSCLE, t)).toBe('Cardio');
        expect(intensityLabel('Средняя', t)).toBe('Medium');
    });

    it('resolves every id in every locale, rather than echoing a key', () => {
        for (const locale of SUPPORTED_LOCALES) {
            const tr = (key: string) => i18next.getFixedT(locale)(key) as unknown as string;
            for (const id of [...MUSCLE_IDS, CARDIO_MUSCLE, ALL_FILTER]) {
                expect(muscleLabel(id, tr), `${id} (${locale})`).not.toContain('gym:');
            }
            for (const id of INTENSITY_IDS) {
                expect(intensityLabel(id, tr), `${id} (${locale})`).not.toContain('gym:');
            }
        }
    });

    it('passes a value it does not know through untouched', () => {
        // A muscle group the user typed into the picker is their word, and it
        // has to survive a language switch unchanged.
        expect(muscleLabel('Предплечья', t)).toBe('Предплечья');
        expect(intensityLabel('Марафонский темп', t)).toBe('Марафонский темп');
    });
});
