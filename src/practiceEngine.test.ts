import { describe, expect, it, vi } from 'vitest';
import { lessons } from './lessons';
import { PracticeEngine, type Settings } from './practiceEngine';

const settings: Settings = {
  bpm: 60, hands: 'both', mode: 'wait', metronome: true, clickVolume: .6,
  subdivisions: false, countIn: 1, loop: false, accompaniment: true,
  startBar: 0, endBar: 0, offset: 0, hints: false,
};
const pulse = lessons.find(lesson => lesson.id === 'pulse')!;
const together = lessons.find(lesson => lesson.id === 'together')!;
const independence = lessons.find(lesson => lesson.id === 'independence')!;

function setup() {
  const audio = { now: 100, play: vi.fn(), click: vi.fn(), stop: vi.fn() };
  return { audio, engine: new PracticeEngine(audio) };
}

describe('practice rounds', () => {
  it('anchors the wait-mode guide to a correct chord and waits at the next onset', () => {
    const { engine, audio } = setup();
    engine.start(together, { ...settings, startBar: 1, endBar: 1, bpm: 120 });
    expect(engine.getScoreTime()).toEqual({ state: 'ready', position: 4 });
    engine.press(50, 100, 'MIDI', true);
    audio.now = 101;
    expect(engine.getScoreTime()?.state).toBe('ready');
    engine.press(62, 101, 'MIDI', true);
    audio.now = 101.25;
    expect(engine.getScoreTime()).toEqual({ state: 'playing', position: 4.5 });
    engine.press(80, 101.25, 'MIDI', true);
    audio.now = 104;
    expect(engine.getScoreTime()).toEqual({ state: 'ready', position: 6 });
    expect(engine.getSnapshot().hits.size).toBe(2);
    engine.pause();
    engine.resume();
    expect(engine.getScoreTime()).toEqual({ state: 'ready', position: 6 });
    engine.stop();
    expect(engine.getScoreTime()).toBeUndefined();
  });

  it.each([true, false])('reads the audio clock through count-in, pause and restart (demo %s)', demo => {
    const { engine, audio } = setup();
    engine.start(pulse, { ...settings, mode: demo ? 'wait' : 'rhythm', startBar: 1, endBar: 1, bpm: 120 }, demo);
    expect(engine.getScoreTime()).toEqual({ state: 'counting', position: 4, countIn: 4 });
    audio.now = 102.12 + .75;
    expect(engine.getScoreTime()?.position).toBeCloseTo(5.5);
    engine.pause();
    audio.now = 200;
    expect(engine.getScoreTime()?.state).toBe('paused');
    expect(engine.getScoreTime()?.position).toBeCloseTo(5.5);
    engine.resume();
    expect(engine.getScoreTime()).toMatchObject({ state: 'counting', countIn: 4 });
    audio.now = 202.12 + .5;
    expect(engine.getScoreTime()?.position).toBeCloseTo(6.5);
    audio.now = 210;
    expect(engine.getScoreTime()).toEqual({ state: 'end', position: 8 });
  });
  it('plays the first piece with optional bass and grades only the learner melody', () => {
    const piece = lessons.find(lesson => lesson.id === 'echo-song')!;
    const { engine, audio } = setup();
    const options: Settings = { ...settings, mode: 'rhythm', endBar: 3, hands: 'right' };
    engine.start(piece, options);
    expect(audio.play.mock.calls.map(call => call[0])).toEqual([48, 48, 50, 48]);
    for (const note of piece.notes) {
      const at = 104.12 + note.beat;
      engine.press(note.midi, at, 'MIDI', false);
      engine.release(note.midi, at + note.duration);
    }
    audio.now = 121;
    expect(engine.tick()?.attempt).toMatchObject({ fullLesson: true, total: 11, hit: 11, wrong: 0, durationErrors: 0 });
    audio.play.mockClear();
    engine.start(piece, { ...options, accompaniment: false });
    expect(audio.play).not.toHaveBeenCalled();
    engine.stop();
    engine.start(piece, { ...options, startBar: 2, endBar: 2 }, true);
    expect(audio.play.mock.calls.map(call => call[0])).toEqual([60, 62, 64, 50]);
  });
  it('updates sounding notes at boundaries and clears the paused preview when resuming inside a rest', () => {
    const { engine, audio } = setup();
    const notes = [
      { ...pulse.notes[0], id: 'short', beat: 4, duration: .5 },
      { ...independence.notes.find(note => note.hand === 'left')!, id: 'long', beat: 4, duration: 1.5 },
      { ...pulse.notes[1], id: 'after-rest', beat: 7, duration: 1 },
    ];
    engine.start({ ...pulse, notes }, { ...settings, mode: 'rhythm', startBar: 1, endBar: 1 });
    const downbeat = 104.12;
    const tick = (at: number) => { audio.now = at; engine.tick(); return engine.getSnapshot(); };
    const chord = tick(downbeat + .1);
    expect(chord.active).toEqual(['short', 'long']);
    expect(tick(downbeat + .4).active).toBe(chord.active);
    expect(tick(downbeat + .6).active).toEqual(['long']);
    expect(tick(downbeat + 2).active).toEqual([]);
    engine.pause();
    expect(engine.getSnapshot()).toMatchObject({ position: 6, active: ['after-rest'] });
    audio.now = 200;
    engine.resume();
    expect(tick(202).active).toEqual(['after-rest']);
    expect(tick(204.2).active).toEqual([]);
    expect(tick(205.3).active).toEqual(['after-rest']);
  });
  it('waits for a whole chord and the final key release, then issues one result per loop', () => {
    const { audio, engine } = setup();
    const options = { ...settings, startBar: 1, endBar: 1, loop: true };
    function playExcerpt() {
      expect(engine.start(together, options)).toBe(true);
      expect(engine.getSnapshot().position).toBe(4);
      engine.press(62, audio.now, 'MIDI', false);
      expect(engine.getSnapshot().hits.size).toBe(0);
      engine.press(50, audio.now, 'MIDI', false);
      expect(engine.getSnapshot().position).toBe(6);
      engine.release(62, audio.now);
      engine.release(50, audio.now);
      engine.press(70, audio.now, 'MIDI', false); // Wrong pitch held into the last chord.
      engine.press(48, audio.now, 'MIDI', false);
      engine.press(60, audio.now, 'MIDI', false);
      engine.press(72, audio.now, 'MIDI', false); // Extra key after all targets were found.
      for (const pitch of [60, 70, 48]) expect(engine.release(pitch, audio.now)).toBeUndefined();
      const result = engine.release(72, audio.now);
      expect(result).toMatchObject({ lessonId: together.id, loop: true, demo: false,
        attempt: { hit: 4, total: 4, wrong: 1, fullLesson: false, input: 'MIDI' } });
      expect(engine.release(72, audio.now)).toBeUndefined();
      expect(engine.tick()).toBeUndefined();
      expect(engine.resume()).toBeUndefined();
      return result!.attempt!.id;
    }
    const first = playExcerpt();
    expect(playExcerpt()).not.toBe(first);
    expect(audio.play).not.toHaveBeenCalled();
    expect(audio.click).not.toHaveBeenCalled();
  });

  it('resumes the incomplete chord and keeps the earlier hits', () => {
    const { audio, engine } = setup();
    engine.start(together, settings);
    for (const pitch of [48, 60]) engine.press(pitch, audio.now, 'MIDI', false);
    for (const pitch of [48, 60]) engine.release(pitch, audio.now);
    engine.press(48, audio.now, 'MIDI', false);
    expect(engine.pause()).toBe(true);
    expect(engine.pause()).toBe(false);
    expect(engine.start(together, settings)).toBe(false);
    expect(engine.getSnapshot()).toMatchObject({ status: 'paused', position: 2 });
    engine.press(60, audio.now, 'MIDI', false);
    engine.resume();
    engine.press(60, audio.now, 'MIDI', false);
    expect(engine.getSnapshot().hits.size).toBe(2);
    engine.press(48, audio.now, 'MIDI', false);
    engine.release(60, audio.now);
    expect(engine.release(48, audio.now)?.attempt).toMatchObject({ hit: 4, assisted: true, wrong: 0 });
  });

  it('scores timestamped input identically across delivery and display cadences', () => {
    function perform(tickDuringInput: boolean) {
      const { audio, engine } = setup();
      engine.start(pulse, { ...settings, mode: 'rhythm', offset: 50 });
      const downbeat = 104.12;
      const deliver = (beat: number, pitch: number, down: boolean) => {
        const at = downbeat + beat + .05;
        audio.now = tickDuringInput ? at : downbeat + 4.2;
        if (tickDuringInput) engine.tick();
        if (down) engine.press(pitch, at, 'MIDI', false);
        else engine.release(pitch, at);
      };
      deliver(0, 60, true); deliver(.75, 60, false);
      deliver(.82, 60, true); deliver(1.82, 60, false);
      deliver(2.2, 60, true); deliver(2.4, 60, false);
      deliver(2.7, 61, true); deliver(2.8, 61, false);
      deliver(3, 60, true); deliver(4, 60, false);
      audio.now = downbeat + 4.46;
      const attempt = engine.tick()!.attempt!;
      expect(engine.tick()).toBeUndefined();
      return [attempt.hit, attempt.wrong, attempt.early, attempt.late, attempt.durationErrors];
    }
    expect(perform(true)).toEqual([4, 1, 1, 1, 1]);
    expect(perform(false)).toEqual([4, 1, 1, 1, 1]);
  });

  it('keeps both sounding hands visible at pause and excludes interrupted holds from duration errors', () => {
    const { audio, engine } = setup();
    engine.start(independence, { ...settings, mode: 'rhythm' });
    engine.press(48, 104.12, 'MIDI', false);
    audio.now = 105.62;
    engine.pause();
    expect([...engine.getSnapshot().active].sort()).toEqual(['left-0', 'right-1']);
    expect(engine.getSnapshot().position).toBeCloseTo(1.5);
    audio.now = 200;
    engine.resume();
    audio.now = 202;
    engine.tick();
    expect(engine.getSnapshot().status).toBe('counting');
    expect(engine.getSnapshot().position).toBeCloseTo(1.5);
    engine.release(48, audio.now);
    audio.now = 207.2;
    expect(engine.tick()?.attempt).toMatchObject({ hit: 1, durationErrors: 0, assisted: true });
  });

  it('schedules the other hand and a full count-in before restarting a sustained note', () => {
    const { audio, engine } = setup();
    engine.start(independence, { ...settings, mode: 'rhythm', hands: 'right', subdivisions: true, metronome: false });
    expect(audio.click).toHaveBeenCalledTimes(8);
    expect(audio.click).toHaveBeenNthCalledWith(2, 100.62, false, .6, true);
    expect(audio.play).toHaveBeenCalledExactlyOnceWith(48, 60, 104.12, 4 * .94);
    audio.now = 105.62;
    engine.pause();
    audio.play.mockClear(); audio.click.mockClear();
    audio.now = 200;
    engine.resume();
    expect(audio.click).toHaveBeenCalledTimes(8);
    expect(audio.play).toHaveBeenCalledExactlyOnceWith(48, 60, 204.12, 4 * .94 - 1.5);
    audio.now = 204.2;
    engine.tick();
    expect(engine.getSnapshot().status).toBe('running');
    expect(audio.click).toHaveBeenCalledTimes(8);
    engine.pause(); engine.stop(true);
    expect(engine.getSnapshot()).toMatchObject({ status: 'idle', position: 0, active: [] });
    expect(engine.resume()).toBeUndefined();
    audio.now = 300;
    expect(engine.tick()).toBeUndefined();
  });

  it('plays both hands in a demo and only scores rounds with performance input', () => {
    const { audio, engine } = setup();
    const options = { ...settings, hands: 'right' as const, loop: true };
    expect(engine.start(pulse, { ...options, hands: 'left' })).toBe(false);
    expect(engine.start(together, options, true)).toBe(true);
    expect(audio.play.mock.calls.map(([pitch]) => pitch).sort()).toEqual([48, 48, 60, 60]);
    audio.now = 105;
    engine.tick();
    expect(engine.getSnapshot().status).toBe('demo');
    engine.press(60, audio.now, 'MIDI', false);
    audio.now = 110;
    expect(engine.tick()).toMatchObject({ demo: true, loop: false, attempt: null });
    engine.start(together, { ...options, mode: 'rhythm' });
    audio.now = 120;
    expect(engine.tick()).toMatchObject({ demo: false, loop: true, attempt: null });
  });

  it('resumes bar five from the last observed beat after a clock jump and restarts the excerpt at a new tempo', () => {
    const { engine, audio } = setup();
    const lesson = { ...independence, beats: 20, notes: independence.notes.filter(note => note.beat < 4)
      .map(note => ({ ...note, beat: note.beat + 16 })) };
    const options: Settings = { ...settings, mode: 'rhythm', hands: 'right', startBar: 4, endBar: 4, loop: true };
    engine.start(lesson, options);
    expect(engine.getSnapshot().position).toBe(16);
    engine.press(60, 104.12, 'MIDI', false);
    engine.release(60, 105.12);
    audio.now = 105.12;
    engine.tick();
    expect(engine.getSnapshot().position).toBeCloseTo(17);
    audio.now += 600;
    engine.pause(engine.getSnapshot().position);
    expect(engine.tick()).toBeUndefined();
    expect(engine.getSnapshot()).toMatchObject({ status: 'paused', position: 17 });
    engine.resume();
    const restart = audio.now + .12 + 4;
    expect(audio.play).toHaveBeenLastCalledWith(48, 60, restart, 4 * .94 - 1);
    for (const [i, pitch] of [62, 64, 62].entries()) {
      audio.now = restart + i;
      engine.tick();
      expect(engine.getSnapshot().position).toBeCloseTo(17 + i);
      engine.press(pitch, audio.now, 'MIDI', false);
      engine.release(pitch, audio.now + 1);
    }
    audio.now = restart + 3.5;
    expect(engine.tick()).toMatchObject({ loop: true, attempt: { hit: 4, early: 0, late: 0, durationErrors: 0 } });
    engine.start(lesson, { ...options, bpm: 120 });
    expect(engine.getSnapshot()).toMatchObject({ position: 16, status: 'counting' });
    expect(audio.play).toHaveBeenLastCalledWith(48, 60, audio.now + .12 + 2, 4 * .94 / 2);
  });
});
