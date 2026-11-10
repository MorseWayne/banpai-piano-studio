import type { Hand, Lesson, Note } from './model';

// A stroke advances one hand's clock. Empty pitches leave a written rest.
type Stroke = { pitches: number[]; fingers: number[]; duration: number; spellings?: Record<number, string> };
export const chord = (pitches: number[], fingers: number[], duration: number): Stroke => ({ pitches, fingers, duration });
export const tone = (pitch: number, finger: number, duration = 1) => chord([pitch], [finger], duration);
export const rest = (duration: number) => chord([], [], duration);
export const run = (pitches: number[], fingers: number[], duration = 1) =>
  pitches.map((pitch, i) => tone(pitch, fingers[i], duration));

export function voice(hand: Hand, strokes: Stroke[]): Note[] {
  let beat = 0;
  return strokes.flatMap(({ pitches, fingers, duration, spellings }) => {
    const onset = beat;
    beat += duration;
    return pitches.map((midi, i) => ({
      id: `${hand}-${onset}-${midi}`, hand, midi, beat: onset, duration, finger: fingers[i],
      spelling: spellings?.[midi],
    }));
  });
}

export type Study = Pick<Lesson, 'id' | 'title' | 'subtitle' | 'theory' | 'tip' | 'bpm' | 'listening' | 'backing'> & {
  assignment: NonNullable<Lesson['assignment']>;
  right: Stroke[]; left?: Stroke[]; meter?: number;
};
export function chapter(stage: string, studies: Study[]): Lesson[] {
  return studies.map(({ right, left = [], meter = 4, ...study }) => {
    const notes = [...voice('right', right), ...voice('left', left)];
    const length = Math.max(...[left, right].map(part => part.reduce((sum, stroke) => sum + stroke.duration, 0)));
    return { ...study, stage, notes, meter, beats: Math.ceil(length / meter) * meter, source: '半拍原创谱例' };
  });
}
