/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { readableText, parseSlideResponse } from '../../supabase/functions/_shared/text';

test('structured slide JSON becomes a heading and readable bullet points', () => {
  expect(readableText({ title: 'Project update', bullet_points: ['Revenue +15%', { text: 'Next review' }], notes: 'December 2026' }))
    .toBe('Project update\n• Revenue +15%\n• Next review\nDecember 2026');
});
test('JSON inside strings is formatted without raw object output', () => {
  expect(readableText('```json\n{"title":"Update","bullets":["One","Two"]}\n```')).toBe('Update\n• One\n• Two');
});
test('plain prose remains unchanged and empty responses remain empty', () => {
  expect(readableText('Today revenue increased by 15%.')).toBe('Today revenue increased by 15%.');
  expect(readableText(null)).toBe('');
});
test('invalid slide JSON is not silently labelled as a successful translation', () => {
  expect(() => parseSlideResponse('not JSON')).toThrow();
  expect(parseSlideResponse('{"original":{"title":"Hello"},"translated":{"title":"Szia"}}'))
    .toEqual({ original: 'Hello', translated: 'Szia' });
});
