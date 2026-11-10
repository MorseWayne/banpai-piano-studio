export type Hand = 'left' | 'right';
export type Hands = Hand | 'both';
export type Mode = 'wait' | 'rhythm';
export interface Note { id: string; midi: number; beat: number; duration: number; hand: Hand; finger?: number; spelling?: string }
export const soundingEndBeat = (note: Note) => note.beat + note.duration * .94;
export interface ListeningTask {
  question: string;
  choices: [string, string];
  answer: 0 | 1;
  explanation: string;
}
export interface Lesson {
  id: string; title: string; subtitle: string; stage: string; bpm: number; beats: number; meter: number;
  notes: Note[]; theory: { title: string; body: string; example: string }; tip: string; source: string;
  assignment?: { task: string; check: string };
  listening?: ListeningTask;
  backing?: Note[];
}
export interface Attempt { id: string; date: string; lessonId: string; title: string; bpm: number; mode: Mode; hands: Hands; hit: number; total: number; wrong: number; early: number; late: number; durationErrors: number; input: string; assisted: boolean; fullLesson: boolean }
export const noteName = (midi: number) => ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi % 12] + (Math.floor(midi / 12) - 1);
export const matchesHand = (n: Note, hands: Hands) => hands === 'both' || n.hand === hands;
export const groupNotes = (notes: Note[]) => [...new Set(notes.map(n => n.beat))].sort((a,b) => a-b).map(beat => notes.filter(n => n.beat === beat));
export class Judge {
  notes: Note[]; hits = new Set<string>(); wrong = 0; early = 0; late = 0; durationErrors = 0;
  groupIndex = 0; groups: Note[][]; held = new Set<number>(); groupPressed = new Set<number>(); pending = new Map<number, { note: Note; at: number }>();
  constructor(notes: Note[], public mode: Mode) { this.notes = notes; this.groups = groupNotes(notes); }
  get current() { return this.groups[this.groupIndex] || []; }
  on(pitch: number, beat: number): 'correct' | 'wrong' | 'pending' {
    if (this.held.has(pitch)) return 'pending';
    this.held.add(pitch);
    if (this.mode === 'wait') {
      const group = this.current;
      if (!group.some(n => n.midi === pitch)) { this.wrong++; return 'wrong'; }
      this.groupPressed.add(pitch);
      if (group.every(n => this.held.has(n.midi)&&this.groupPressed.has(n.midi))) { group.forEach(n => this.hits.add(n.id)); this.groupIndex++; this.groupPressed.clear();return 'correct'; }
      return 'pending';
    }
    const candidate = this.notes.filter(n => n.midi === pitch && !this.hits.has(n.id) && Math.abs(n.beat - beat) <= .4).sort((a,b) => Math.abs(a.beat-beat)-Math.abs(b.beat-beat))[0];
    if (!candidate) { this.wrong++; return 'wrong'; }
    this.hits.add(candidate.id); this.pending.set(pitch, { note: candidate, at: beat });
    if (beat - candidate.beat < -.13) this.early++;
    if (beat - candidate.beat > .13) this.late++;
    return 'correct';
  }
  off(pitch: number, beat: number) {
    this.held.delete(pitch);
    const p = this.pending.get(pitch);
    if (p && Math.abs((beat-p.at)-p.note.duration) > Math.max(.3, p.note.duration*.3)) this.durationErrors++;
    this.pending.delete(pitch);
  }
  finish(beat: number) { for (const pitch of [...this.pending.keys()]) this.off(pitch, beat); }
}
export function decodeMidi(bytes: number[]) {
  if (bytes.length < 3) return null;
  const [status,note,value] = bytes; const type = status & 0xf0;
  if (type === 0x90 && value > 0) return { type: 'on' as const, note, value };
  if (type === 0x80 || (type === 0x90 && value === 0)) return { type: 'off' as const, note, value };
  if (type === 0xb0 && note === 64) return { type: 'sustain' as const, note, value };
  if (type === 0xb0 && (note === 120 || note === 123)) return { type: 'panic' as const, note, value };
  return null;
}
