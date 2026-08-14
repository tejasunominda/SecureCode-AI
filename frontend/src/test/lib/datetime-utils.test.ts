import { describe, it, expect } from 'vitest';
import { formatUtcTimestamp, formatUtcDate, formatUtcTime, toUtcIsoString, getCurrentUtcTimestamp } from '@/lib/datetime-utils';

describe('datetime-utils', () => {
  const testDate = new Date('2025-01-15T10:30:45.000Z');

  describe('formatUtcTimestamp', () => {
    it('formats a valid ISO string', () => {
      const result = formatUtcTimestamp('2025-01-15T10:30:45.000Z', {
        locale: 'en-US',
        timezone: 'UTC',
      });
      expect(result).toContain('2025');
      expect(result).toContain('15');
    });

    it('formats a Date object', () => {
      const result = formatUtcTimestamp(testDate, {
        locale: 'en-US',
        timezone: 'UTC',
      });
      expect(result).toContain('2025');
    });

    it('returns dash for null', () => {
      expect(formatUtcTimestamp(null)).toBe('—');
    });

    it('returns dash for undefined', () => {
      expect(formatUtcTimestamp(undefined)).toBe('—');
    });

    it('returns dash for invalid date string', () => {
      expect(formatUtcTimestamp('not-a-date')).toBe('—');
    });

    it('respects includeDate false', () => {
      const result = formatUtcTimestamp(testDate, {
        locale: 'en-US',
        timezone: 'UTC',
        includeDate: false,
      });
      expect(result).not.toContain('2025');
    });

    it('respects includeTime false', () => {
      const result = formatUtcTimestamp(testDate, {
        locale: 'en-US',
        timezone: 'UTC',
        includeTime: false,
      });
      expect(result).toContain('2025');
      expect(result).not.toMatch(/\d{2}:\d{2}/);
    });

    it('respects includeSeconds false', () => {
      const withSeconds = formatUtcTimestamp(testDate, {
        locale: 'en-US',
        timezone: 'UTC',
        includeDate: false,
        includeSeconds: true,
      });
      const withoutSeconds = formatUtcTimestamp(testDate, {
        locale: 'en-US',
        timezone: 'UTC',
        includeDate: false,
        includeSeconds: false,
      });
      expect(withSeconds).toContain(':');
      expect(withoutSeconds.length).toBeLessThanOrEqual(withSeconds.length);
    });
  });

  describe('formatUtcDate', () => {
    it('formats date only', () => {
      const result = formatUtcDate(testDate, 'en-US');
      expect(result).toContain('2025');
      expect(result).not.toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('formatUtcTime', () => {
    it('formats time only', () => {
      const result = formatUtcTime(testDate, 'en-US');
      expect(result).toMatch(/\d{2}:\d{2}/);
      expect(result).not.toContain('2025');
    });
  });

  describe('toUtcIsoString', () => {
    it('converts Date to ISO string', () => {
      const result = toUtcIsoString(testDate);
      expect(result).toBe('2025-01-15T10:30:45.000Z');
    });
  });

  describe('getCurrentUtcTimestamp', () => {
    it('returns a valid ISO string', () => {
      const result = getCurrentUtcTimestamp();
      expect(() => new Date(result)).not.toThrow();
      expect(new Date(result).toISOString()).toBe(result);
    });
  });
});
