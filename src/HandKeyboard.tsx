import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Piano } from '@audio-ui/react/piano';
import { fingerOffset, fingeringFrame, hasFinger, keyX, type Motion } from './fingeringPose';
import { noteName, type Note } from './model';
import type { makePianoScene } from './pianoScene';

const whites = Array.from({ length: 88 }, (_, i) => i + 21).filter(midi => Number.isInteger(keyX(midi)));
const fingers = ['', '拇指', '食指', '中指', '无名指', '小指'];

export function HandKeyboard({ notes, target, down, hits, beat, motion, onDown, onUp, onFailure }: {
  notes: Note[]; target: Note[]; down: Set<number>; hits: Set<string>; beat: number; motion: Motion;
  onDown: (pitch: number) => void; onUp: (pitch: number) => void; onFailure: () => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<ReturnType<typeof makePianoScene> | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rect, setRect] = useState<CSSProperties>();
  const [ready, setReady] = useState(false);
  const frame = useMemo(() => fingeringFrame(notes, target, down, hits, beat, motion), [notes, target, down, hits, beat, motion]);
  const latest = useRef({ frame, down, onFailure });
  latest.current = { frame, down, onFailure };
  const [low, high] = useMemo(() => {
    let min = Infinity, max = -Infinity;
    for (const note of notes) {
      const x = keyX(note.midi);
      const palm = hasFinger(note) ? x - fingerOffset(note.hand, note.finger!) : x;
      min = Math.min(min, x, palm - 2); max = Math.max(max, x, palm + 2);
    }
    if (!notes.length) { min = -3; max = 4; }
    const count = Math.min(52, Math.max(14, Math.ceil(max - min + 4), Math.round(size.width / (size.height || 1) * 8.8 - 1)));
    const start = Math.max(0, Math.min(52 - count, Math.round((min + max - count + 1) / 2 - keyX(whites[0]))));
    return [whites[start], whites[start + count - 1]];
  }, [notes, size]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      clearTimeout(timer);
      timer = setTimeout(() => setSize({ width: Math.round(width), height: Math.round(height) }), 80);
    });
    observer.observe(stage.current!);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, []);
  useEffect(() => {
    const element = canvas.current;
    if (!element || !size.width || !size.height) return;
    let cancelled = false;
    const fail = () => { if (!cancelled) latest.current.onFailure(); };
    element.addEventListener('webglcontextlost', fail);
    setReady(false);
    void import('./pianoScene').then(async ({ makePianoScene }) => {
      if (cancelled) return;
      const view = makePianoScene(element, low, high, size.width, size.height);
      scene.current = view;
      setRect(view.inputRect);
      view.update(latest.current.frame, latest.current.down);
      await view.ready;
      if (!cancelled) setReady(true);
    }).catch(fail);
    return () => {
      cancelled = true;
      element.removeEventListener('webglcontextlost', fail);
      scene.current?.dispose();
      scene.current = null;
    };
  }, [low, high, size]);
  useEffect(() => { scene.current?.update(frame, down); }, [frame, down]);

  return <div className="hand-view">
    <div className="hand-stage" ref={stage} aria-busy={!ready}>
      <canvas ref={canvas} aria-hidden="true" />
      {rect && <Piano.Root aria-label="立体钢琴键盘" className="hand-input" style={{ ...rect, position: 'absolute' }}
        minPitch={low} maxPitch={high} activeNotes={[...down]} onNoteOn={pitch => onDown(pitch)} onNoteOff={onUp}>
        <Piano.Keys>{pitch => {
          const cue = frame.cues.find(item => item.note.midi === pitch);
          return <Piano.Key pitch={pitch} aria-label={noteName(pitch) + ' 琴键'}
            className={({ color }) => 'hand-key ' + color} data-hand={cue?.note.hand}>
            {cue && <span className="hand-key-marker">{hasFinger(cue.note) ? cue.note.finger : '•'}</span>}
            {pitch % 12 === 0 && <span className="hand-key-name">{noteName(pitch)}</span>}
          </Piano.Key>;
        }}</Piano.Keys>
      </Piano.Root>}
      {!ready && <span className="hand-loading">正在载入立体琴键…</span>}
    </div>
    <div className="hand-readout" aria-label="当前示范指法">
      {(['left', 'right'] as const).map(hand => {
        const cues = frame.cues.filter(cue => cue.note.hand === hand);
        if (!cues.length) return null;
        return <span key={hand} data-hand={hand}><i />{hand === 'left' ? '左手' : '右手'}
          <b>{cues.map(({ note }) => noteName(note.midi) + (hasFinger(note) ? ' · ' + fingers[note.finger!] : ' · 未标指法')).join('、')}</b></span>;
      })}
      {!frame.cues.length && <span>{motion === 'off' ? '指法提示已隐藏' : '休止'}</span>}
    </div>
  </div>;
}
