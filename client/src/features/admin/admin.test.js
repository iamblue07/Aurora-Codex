import { describe, expect, it } from 'vitest';
import { describeResult } from './labels';
import { parseSettingInput } from './settings-input';

const integer = { key: 'recommendations.resultCount', type: 'integer', min: 1, max: 50 };
const decimal = { key: 'recommendations.emotionWeight', type: 'number', min: 0, max: 1 };
const model = { key: 'embeddings.model', type: 'string', maxLength: 128 };
const instruction = { key: 'embeddings.queryInstruction', type: 'string', maxLength: 10 };

describe('parseSettingInput', () => {
    it('parses numbers, accepting a decimal comma', () => {
        expect(parseSettingInput(integer, '12')).toEqual({ value: 12 });
        expect(parseSettingInput(decimal, '0,35')).toEqual({ value: 0.35 });
    });

    it('explains invalid numbers in Romanian', () => {
        expect(parseSettingInput(integer, '')).toEqual({ error: 'Introdu un număr.' });
        expect(parseSettingInput(integer, '2.5')).toEqual({ error: 'Introdu un număr întreg.' });
        expect(parseSettingInput(integer, '999')).toEqual({ error: 'Valoarea trebuie să fie între 1 și 50.' });
    });

    it('trims text, requires model names and enforces the length limit', () => {
        expect(parseSettingInput(model, '  BAAI/bge-m3 ')).toEqual({ value: 'BAAI/bge-m3' });
        expect(parseSettingInput(model, ' ')).toEqual({ error: 'Câmpul este obligatoriu.' });
        expect(parseSettingInput(instruction, '')).toEqual({ value: '' });
        expect(parseSettingInput(instruction, 'x'.repeat(11))).toEqual({ error: 'Maximum 10 caractere.' });
    });

    it('passes booleans through', () => {
        expect(parseSettingInput({ key: 'recommendations.excludeRead', type: 'boolean' }, false)).toEqual({ value: false });
    });
});

describe('describeResult', () => {
    it('summarises each job type in Romanian', () => {
        expect(describeResult({ type: 'embeddings', result: { embedded: 1200, skipped: 50000, failed: 0, tokens: 450000 } }))
            .toBe('1.200 vectori noi · 50.000 neschimbați · 0 erori · 450.000 tokeni');
        expect(describeResult({ type: 'scraper', result: { created: 3, updated: 10, failures: 1 } }))
            .toBe('3 cărți noi · 10 actualizate · 1 erori');
        expect(describeResult({ type: 'emotions', result: null })).toBeNull();
    });
});
