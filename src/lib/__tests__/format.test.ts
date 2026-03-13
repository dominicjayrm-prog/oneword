import { formatDescription } from '../format';

describe('formatDescription', () => {
  it('capitalises the first letter', () => {
    expect(formatDescription('hello world today is great')).toBe('Hello world today is great');
  });

  it('leaves already capitalised strings unchanged', () => {
    expect(formatDescription('Already capitalised here')).toBe('Already capitalised here');
  });

  it('returns empty string as-is', () => {
    expect(formatDescription('')).toBe('');
  });

  it('handles single character', () => {
    expect(formatDescription('a')).toBe('A');
  });

  it('leaves numbers/symbols as first character', () => {
    expect(formatDescription('3 blind mice today')).toBe('3 blind mice today');
    expect(formatDescription('!what a day this')).toBe('!what a day this');
  });

  it('only capitalises the first character, not each word', () => {
    expect(formatDescription('one two three four five')).toBe('One two three four five');
  });
});
