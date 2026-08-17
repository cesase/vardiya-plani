import { describe, expect, it } from 'vitest';
import { DEFAULT_SHIFTS } from '../src/constants';
import { formatMinutes, getShiftMinutes, parseClock } from '../src/utils/time';

describe('çalışma süresi hesapları', () => {
  it('varsayılan vardiyaların molalarını net süreden düşer', () => {
    expect(getShiftMinutes(DEFAULT_SHIFTS[0])).toBe(7 * 60 + 15);
    expect(getShiftMinutes(DEFAULT_SHIFTS[1])).toBe(6 * 60 + 15);
    expect(getShiftMinutes(DEFAULT_SHIFTS[2])).toBe(11 * 60);
  });

  it('saat biçimini doğrular', () => {
    expect(parseClock('08:45')).toBe(525);
    expect(parseClock('21:15')).toBe(1275);
    expect(parseClock('25:00')).toBeNull();
    expect(parseClock('8.45')).toBeNull();
  });

  it('dakikayı anlaşılır biçimde gösterir', () => {
    expect(formatMinutes(2700)).toBe('45 sa');
    expect(formatMinutes(2655)).toBe('44 sa 15 dk');
  });
});

