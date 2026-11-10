import { Judge, matchesHand, soundingEndBeat, type Attempt, type Hands, type Lesson, type Mode, type Note } from './model';
import { inputBeat } from './midiTiming';

export interface Settings {
  bpm: number; hands: Hands; mode: Mode; metronome: boolean; clickVolume: number;
  subdivisions: boolean; countIn: number; loop: boolean; accompaniment: boolean;
  startBar: number; endBar: number; offset: number; hints: boolean;
}

interface Playback {
  readonly now: number;
  play(pitch: number, velocity: number, at: number, duration: number): void;
  click(at: number, strong: boolean, level: number, subdivision?: boolean): void;
  stop(): void;
}

interface Snapshot {
  status: 'idle' | 'counting' | 'running' | 'demo' | 'paused' | 'finished';
  position: number; // Absolute lesson beat. Judge and scheduler use beats relative to the excerpt.
  beat: number;
  active: string[];
  hits: Set<string>;
}

interface Round {
  id: string;
  lesson: Lesson;
  settings: Settings;
  judge: Judge;
  all: Note[];
  selected: Note[];
  startBeat: number;
  length: number;
  wait: boolean;
  demo: boolean;
  assisted: boolean;
  sources: Set<string>;
  startTime: number;
  resumeBeat: number;
  nextClick: number;
  nextNoteChange: number;
}

export interface Completion {
  lessonId: string;
  demo: boolean;
  loop: boolean;
  attempt: Attempt | null;
}

const initialSnapshot = (): Snapshot => ({ status: 'idle', position: 0, beat: -1, active: [], hits: new Set() });

export class PracticeEngine {
  private round: Round | null = null;
  private view = initialSnapshot();
  private listeners = new Set<() => void>();

  constructor(private playback: Playback) {}

  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  get busy() { return this.round !== null && this.view.status !== 'paused'; }

  private publish(change: Partial<Snapshot>) {
    this.view = { ...this.view, ...change };
    for (const listener of this.listeners) listener();
  }

  start(lesson: Lesson, settings: Settings, demo = false) {
    if (this.round) return false;
    const startBeat = settings.startBar * lesson.meter;
    const length = (settings.endBar - settings.startBar + 1) * lesson.meter;
    const all = lesson.notes.filter(note => note.beat >= startBeat && note.beat < startBeat + length)
      .map(note => ({ ...note, beat: note.beat - startBeat }));
    const selected = all.filter(note => matchesHand(note, settings.hands));
    if (!selected.length) return false;
    const round: Round = {
      id: crypto.randomUUID(), lesson, settings: { ...settings }, judge: new Judge(selected, settings.mode),
      all, selected, startBeat, length, wait: !demo && settings.mode === 'wait', demo,
      assisted: settings.hints, sources: new Set(), startTime: 0, resumeBeat: 0, nextClick: 0, nextNoteChange: 0,
    };
    this.round = round;
    this.beginSegment(round, false);
    return true;
  }

  private beginSegment(round: Round, resuming: boolean) {
    this.playback.stop();
    const { settings, lesson, resumeBeat, wait } = round;
    const seconds = 60 / settings.bpm;
    const leadIn = wait ? 0 : settings.countIn * lesson.meter;
    const firstClick = this.playback.now + .12;
    round.startTime = firstClick + (leadIn - resumeBeat) * seconds;
    const step = settings.subdivisions ? .5 : 1;
    round.nextClick = Math.ceil(resumeBeat / step) * step;
    round.nextNoteChange = resumeBeat;
    for (let beat = 0; beat < leadIn; beat += step) {
      this.playback.click(firstClick + beat * seconds, beat % lesson.meter === 0, settings.clickVolume, beat % 1 !== 0);
    }
    if (!wait) {
      for (const note of round.all) {
        const end = soundingEndBeat(note);
        if (end <= resumeBeat) continue;
        if (!round.demo && !(settings.accompaniment && settings.hands !== 'both' && !matchesHand(note, settings.hands))) continue;
        const onset = Math.max(note.beat, resumeBeat);
        this.playback.play(note.midi, note.hand === 'left' ? 60 : 85, round.startTime + onset * seconds, (end - onset) * seconds);
      }
    }
    this.publish({
      status: wait ? 'running' : 'counting', beat: -1,
      position: round.startBeat + (wait ? round.judge.current[0]?.beat ?? resumeBeat : resumeBeat),
      hits: resuming ? this.view.hits : new Set(),
      active: resuming ? this.view.active : wait ? round.judge.current.map(n => n.id) : [],
    });
  }

  pause(position?: number) {
    const r = this.round;
    if (!r || !this.busy) return false;
    const t = position === undefined ? inputBeat(this.playback.now, r.startTime, r.settings.bpm, 0) : position - r.startBeat;
    r.resumeBeat = r.wait ? r.judge.current[0]?.beat ?? r.length : Math.max(r.resumeBeat, Math.min(r.length, t));
    r.assisted = true;
    // A pause releases the keys without grading the interrupted note lengths.
    r.judge.pending.clear();
    r.judge.held.clear();
    r.judge.groupPressed.clear();
    this.playback.stop();
    const sounding = r.wait ? r.judge.current : r.selected.filter(n => n.beat <= r.resumeBeat && n.beat + n.duration > r.resumeBeat);
    const group = !r.wait && !sounding.length ? r.judge.groups.find(notes => notes[0].beat > r.resumeBeat) ?? [] : sounding;
    this.publish({ status: 'paused', beat: -1, position: r.startBeat + r.resumeBeat, active: group.map(n => n.id) });
    return true;
  }

  resume(): Completion | undefined {
    const r = this.round;
    if (!r || this.view.status !== 'paused') return;
    if (r.resumeBeat >= r.length) return this.finish(r);
    this.beginSegment(r, true);
  }

  stop(resetPosition = false) {
    this.round = null;
    this.playback.stop();
    this.publish(resetPosition ? initialSnapshot() : { status: 'idle', beat: -1, active: [] });
  }

  press(pitch: number, at: number, source: string, hints: boolean, offsetMs?: number): string | undefined {
    const r = this.round;
    if (!r || !this.busy || r.demo || r.judge.held.has(pitch)) return;
    if (r.wait && !r.judge.current.length) {
      r.judge.held.add(pitch);
      return;
    }
    const beat = inputBeat(at, r.startTime, r.settings.bpm, offsetMs ?? r.settings.offset);
    if (!r.wait && (beat < r.resumeBeat - .15 || beat >= r.length + .4)) return;
    r.assisted ||= hints;
    r.sources.add(source);
    const verdict = r.judge.on(pitch, beat);
    if (verdict === 'wrong') return r.wait ? '音高有偏差，请看谱再试一次。' : '继续跟着拍子走，结束后再回顾。';
    if (verdict !== 'correct') return;
    const hits = new Set(r.judge.hits);
    if (!r.wait) { this.publish({ hits }); return; }
    const next = r.judge.current;
    this.publish({ hits, active: next.map(n => n.id), position: next.length ? r.startBeat + next[0].beat : this.view.position });
    return next.length ? '找到了。松开琴键，继续下一组。' : '最后一个音找到了。自然松开琴键，完成这一轮。';
  }

  release(pitch: number, at: number, offsetMs?: number): Completion | undefined {
    const r = this.round;
    if (!r || !this.busy || r.demo) return;
    r.judge.off(pitch, inputBeat(at, r.startTime, r.settings.bpm, offsetMs ?? r.settings.offset));
    if (r.wait && !r.judge.current.length && !r.judge.held.size) return this.finish(r);
  }

  tick(): Completion | undefined {
    const r = this.round;
    if (!r || !this.busy || r.wait) return;
    const { settings, lesson } = r;
    const now = this.playback.now, seconds = 60 / settings.bpm;
    const t = inputBeat(now, r.startTime, settings.bpm, 0);
    while (r.nextClick <= t + .15 / seconds && r.nextClick < r.length) {
      const at = r.startTime + r.nextClick * seconds;
      if (settings.metronome && at >= now - .02) {
        this.playback.click(Math.max(at, now), Math.abs(r.nextClick % lesson.meter) < .001, settings.clickVolume, r.nextClick % 1 !== 0);
      }
      r.nextClick += settings.subdivisions ? .5 : 1;
    }
    const position = r.startBeat + Math.max(r.resumeBeat, t);
    if (t >= r.length + .45) return this.finish(r, position);
    const counting = t < r.resumeBeat;
    const displayBeat = counting ? Math.max(0, t - r.resumeBeat + settings.countIn * lesson.meter) : t;
    const beat = ((Math.floor(displayBeat) % lesson.meter) + lesson.meter) % lesson.meter;
    const status = counting ? 'counting' : r.demo ? 'demo' : 'running';
    if (this.view.position === position && this.view.status === status && this.view.beat === beat) return;
    let active = this.view.active;
    if (!counting && t >= r.nextNoteChange) {
      const ids: string[] = [];
      r.nextNoteChange = Infinity;
      for (const note of r.selected) {
        if (note.beat > t) {
          r.nextNoteChange = Math.min(r.nextNoteChange, note.beat);
        } else if (note.beat + note.duration > t) {
          ids.push(note.id);
          r.nextNoteChange = Math.min(r.nextNoteChange, note.beat + note.duration);
        }
      }
      if (ids.length !== active.length || ids.some((id, i) => id !== active[i])) active = ids;
    }
    this.publish({ status, beat, position, active });
  }

  private finish(r: Round, position = this.view.position): Completion {
    this.round = null;
    r.judge.finish(r.length);
    this.playback.stop();
    const { judge, settings, lesson } = r;
    const attempt: Attempt | null = r.demo || !r.sources.size ? null : {
      id: r.id, date: new Date().toISOString(), lessonId: lesson.id, title: lesson.title,
      bpm: settings.bpm, mode: settings.mode, hands: settings.hands, hit: judge.hits.size,
      total: r.selected.length, wrong: judge.wrong, early: judge.early, late: judge.late,
      durationErrors: judge.durationErrors, input: [...r.sources].join(' / '),
      assisted: r.assisted, fullLesson: r.selected.length === lesson.notes.length,
    };
    this.publish({ status: 'finished', beat: -1, active: [], position });
    return { attempt, lessonId: lesson.id, loop: settings.loop && !r.demo, demo: r.demo };
  }
}
