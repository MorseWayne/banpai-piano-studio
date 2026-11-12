import { lessons } from './lessons';
import type { Attempt, Lesson } from './model';
import { read } from './storage';

export const echoSteps = [
  { name: '听句子', title: '听听旋律怎样回答', instruction: '听两小节，第一句结束时吸一口气，再跟唱第二句。比较第二句的起音和收尾。' },
  { name: '右手旋律', title: '用三个白键弹一问一答', instruction: '右手拇指放在中央 C，食指和中指分别放在 D、E。每句的第三个音占两拍。第二小节开头再弹一次 E，让两句的边界听得见。' },
  { name: '左手低音', title: '一小节，只换一次低音', instruction: '左手小指放在 C3，无名指准备 D3。低音依次是 C、C、D、C。每小节数四拍，第二小节也要重新起音。边弹边唱右手的问句。' },
  { name: '双手合奏', title: '让左手托住右手的问句', instruction: '第三小节右手回到中央 C，左手同时换到 D3。先从这里练两小节，再回到开头合奏。想检查长音是否留足，可选择跟拍。' },
  { name: '陌生谱检验', title: '换一条旋律，自己读出来', instruction: '仍然只用 C、D、E。先看谱找起音，留意重复音和折返处。首遍关掉示范与亮键，按自己的速度读完两小节。' },
] as const;

const duet = lessons.find(lesson => lesson.id === 'echo-duet')!;
function part(id: string, hand: 'left' | 'right', beats: number): Lesson {
  return { ...duet, id, notes: duet.notes.filter(note => note.hand === hand && note.beat < beats), beats };
}
export const melody = part('workshop-melody', 'right', 8);
export const bass = part('workshop-bass', 'left', 16);
export const guidedScores = [melody, melody, bass, duet];

// Each first bar and ending differs from the rehearsed two-bar call and response.
const openings = [[62, 64, 62], [64, 62, 62], [60, 64, 62], [62, 60, 62]];
const endings = [[64, 60, 62], [62, 64, 60], [60, 62, 60]];
export const transferScores: Lesson[] = openings.flatMap((opening, i) => endings.map((ending, j) => {
  const id = `echo-reading-${i + 1}-${j + 1}`;
  const durations = i % 2 === 0 ? [1, 2, 1, 2, 1, 1] : [2, 1, 1, 1, 1, 2];
  let beat = 0;
  const notes = [...opening, ...ending].map((midi, k) => {
    const note = { id: id + '-' + k, midi, hand: 'right' as const, beat, duration: durations[k] };
    beat += note.duration;
    return note;
  });
  return { ...melody, id, title: '两小节首读', notes };
}));

export interface EchoProgress { step: number; done: number[]; seen: string[]; passed: string[] }
export function loadEchoProgress(): EchoProgress {
  const value = read<Partial<EchoProgress> | null>('echoWorkshop', null);
  const validSteps = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < echoSteps.length;
  const known = (xs: unknown) => Array.isArray(xs) ? [...new Set(xs.filter((x): x is string => transferScores.some(s => s.id === x)))] : [];
  const seen = known(value?.seen);
  const passed = known(value?.passed).filter(id => seen.includes(id));
  const done = Array.isArray(value?.done) ? [...new Set(value.done.filter(validSteps))].filter(n => n < 4) : [];
  if (passed.length >= 2) done.push(4);
  return { step: validSteps(value?.step) ? value.step : 0, done, seen, passed };
}

export function cleanFirstRead(attempt: Attempt, fresh: boolean) {
  return fresh && !attempt.assisted && attempt.fullLesson && attempt.wrong === 0 && attempt.hit === attempt.total;
}
