import { describe, expect, it } from 'vitest';
import { Judge, type Note } from './model';
import { inputAudioTime, inputBeat, NativeMidiClock, sampleNativeClock } from './midiTiming';

describe('MIDI event clocks', () => {
  it('uses the shortest IPC round trip to align independent time origins', async () => {
    const pageTimes = [100, 160, 200, 204, 300, 318];
    const hostTimes = [6030000, 6102000, 6201000];
    const offset = await sampleNativeClock(async () => hostTimes.shift()!, () => pageTimes.shift()!);
    expect(offset).toBe(-5900);
  });

  it('grades the same performance identically under native callback and WebView delivery jitter', () => {
    const notes: Note[] = [1, 2, 3].map((beat, i) => ({
      id: String(i), midi: 60 + i, beat, duration: .5, hand: 'right',
    }));
    // At 120 BPM, attack 1 is on time, 2 is early, 3 is late and held too long.
    const performance = [[60, 500, 750], [61, 910, 1160], [62, 1600, 2100]];
    function grade(callbackDelay: number[], deliveryDelay: number[], native: boolean) {
      const judge = new Judge(notes, 'rhythm');
      const clock = new NativeMidiClock(-5000);
      clock.observeOriginBound(6000000);
      let i = 0;
      for (const [pitch, on, off] of performance) {
        for (const elapsed of [on, off]) {
          const deviceMs = elapsed + 40; // 40 ms user calibration
          const pageMs = 1000 + deviceMs;
          const received = pageMs + callbackDelay[i] + deliveryDelay[i];
          const eventMs = native ? clock.eventTimeMs(deviceMs * 1000, (6000 + deviceMs + callbackDelay[i]) * 1000, received) : pageMs;
          const audio = inputAudioTime(eventMs, received, 9 + received / 1000);
          const beat = inputBeat(audio, 10, 120, 40);
          if (elapsed === on) judge.on(pitch, beat);
          else judge.off(pitch, beat);
          i++;
        }
      }
      return [judge.hits.size, judge.wrong, judge.early, judge.late, judge.durationErrors];
    }
    const zero = Array(6).fill(0);
    for (const native of [false, true]) {
      expect(grade(zero, zero, native)).toEqual([3, 0, 1, 1, 1]);
      expect(grade([45, 12, 88, 2, 35, 6], [190, 250, 20, 280, 110, 80], native)).toEqual([3, 0, 1, 1, 1]);
    }
  });

  it('supports arbitrary backend epochs and renews the mapping on timestamp rollover', () => {
    const clock = new NativeMidiClock(100);
    expect(clock.eventTimeMs(9000000, 4000000, 4300)).toBe(4100);
    expect(clock.eventTimeMs(9010000, 4070000, 4340)).toBe(4110);
    expect(clock.eventTimeMs(0, 6000000, 6300)).toBe(6100);
  });
});
