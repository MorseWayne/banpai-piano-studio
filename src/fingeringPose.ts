import type { Hand, Note } from './model';

// Keyboard space is measured in white-key widths, with middle C at zero.
const semitones = [0, .5, 1, 1.5, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6];
export function keyX(midi: number) {
  return (Math.floor(midi / 12) - 5) * 7 + semitones[midi % 12];
}
export const hasFinger = (note: Note) => Number.isInteger(note.finger) && note.finger! >= 1 && note.finger! <= 5;
export const fingerOffset = (hand: Hand, finger: number) => (hand === 'right' ? 1 : -1) * (finger - 3);

export interface Cue { note: Note; pressed: boolean }
export interface FingerPose { center: number; fingers: Cue[] }
export interface HandFrame {
  cues: Cue[];
  hands: Partial<Record<Hand, FingerPose>>;
}
export type Motion = 'preview' | 'wait' | 'timed' | 'off';

export function fingeringFrame(notes: Note[], target: Note[], down: Set<number>, hits: Set<string>,
  beat: number, motion: Motion): HandFrame {
  const frame: HandFrame = { cues: [], hands: {} };
  if (motion === 'off') return frame;
  // Wait mode advances immediately on note-on. Keep showing the finger that is
  // still physically down, even after the judge has moved to the next group.
  const held = motion === 'wait' ? notes.filter(note => hits.has(note.id) && down.has(note.midi)
    && note.beat < beat && note.beat + note.duration >= beat) : [];
  const current = [...held, ...target.filter(note => !held.some(previous => previous.hand === note.hand
    && previous.midi === note.midi && previous.finger === note.finger))];
  frame.cues = current.map(note => ({ note, pressed: motion === 'timed'
    ? beat >= note.beat && beat < note.beat + note.duration * .94
    : down.has(note.midi) && !held.some(previous => previous.id !== note.id
      && previous.hand === note.hand && previous.midi === note.midi && previous.finger !== note.finger) }));
  for (const hand of ['left', 'right'] as const) {
    const cues = frame.cues.filter(cue => cue.note.hand === hand);
    const fingers = cues.filter(cue => hasFinger(cue.note));
    // Lead a free finger toward its next note while the sounding fingers stay put.
    if (motion === 'timed') {
      for (const note of notes) {
        if (note.hand === hand && hasFinger(note) && note.beat > beat && note.beat <= beat + .28
          && !fingers.some(cue => cue.note.finger === note.finger)) fingers.push({ note, pressed: false });
      }
    }
    if (!fingers.length) continue;
    const anchors = fingers.map(({ note }) => keyX(note.midi) - fingerOffset(hand, note.finger!));
    frame.hands[hand] = { center: anchors.reduce((sum, x) => sum + x, 0) / anchors.length, fingers };
  }
  return frame;
}
