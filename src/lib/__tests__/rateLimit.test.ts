import { rateLimit, resetRateLimit } from '../rateLimit';

describe('rateLimit', () => {
  beforeEach(() => {
    resetRateLimit('test');
  });

  it('allows actions within the limit', () => {
    expect(rateLimit('test', 3, 10_000)).toBe(true);
    expect(rateLimit('test', 3, 10_000)).toBe(true);
    expect(rateLimit('test', 3, 10_000)).toBe(true);
  });

  it('blocks actions exceeding the limit', () => {
    rateLimit('test', 2, 10_000);
    rateLimit('test', 2, 10_000);
    expect(rateLimit('test', 2, 10_000)).toBe(false);
  });

  it('resets when resetRateLimit is called', () => {
    rateLimit('test', 1, 10_000);
    expect(rateLimit('test', 1, 10_000)).toBe(false);
    resetRateLimit('test');
    expect(rateLimit('test', 1, 10_000)).toBe(true);
  });

  it('uses separate buckets for different keys', () => {
    rateLimit('key1', 1, 10_000);
    expect(rateLimit('key1', 1, 10_000)).toBe(false);
    expect(rateLimit('key2', 1, 10_000)).toBe(true);
  });
});
