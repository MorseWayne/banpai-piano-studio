import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Piano } from '@audio-ui/react/piano';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { fingerOffset, fingeringChangeBeats, fingeringFrame, hasFinger, keyX, type Motion } from './fingeringPose';
import { beatIndex, usePlaybackPosition, type PlaybackView } from './practiceView';
import { noteName, type Hand, type Note } from './model';
import type { makePianoScene, PianoView } from './pianoScene';

const whites = Array.from({ length: 88 }, (_, i) => i + 21).filter(midi => Number.isInteger(keyX(midi)));
const fingers = ['', '拇指', '食指', '中指', '无名指', '小指'];

export function HandKeyboard({ notes, target, down, hits, beat = 0, motion, playback, onDown, onUp, onFailure }: {
  notes: Note[]; target: Note[]; down: Set<number>; hits: Set<string>; beat?: number; motion: Motion;
  playback?: PlaybackView; onDown: (pitch: number) => void; onUp: (pitch: number) => void; onFailure: () => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<ReturnType<typeof makePianoScene> | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rect, setRect] = useState<CSSProperties>();
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<PianoView>('player');
  const [detailHand, setDetailHand] = useState<Hand | null>(null);
  const [elevation, setElevation] = useState(18);
  const [zoom, setZoom] = useState(1);
  const inspection = useMemo(() => detailHand ? {
    hand: detailHand, elevation, zoom, fraction: size.width < 600 ? .5 : .42,
  } : null, [detailHand, elevation, zoom, size.width]);
  const boundaries = useMemo(() => motion === 'timed' ? fingeringChangeBeats(notes) : [], [notes, motion]);
  const poseBeat = usePlaybackPosition(motion === 'timed' || motion === 'wait' ? playback : undefined,
    position => motion === 'timed' ? boundaries[beatIndex(boundaries, position)] : position, beat);
  const frame = useMemo(() => fingeringFrame(notes, target, down, hits, poseBeat, motion), [notes, target, down, hits, poseBeat, motion]);
  const latest = useRef({ frame, down, onFailure, view, inspection });
  latest.current = { frame, down, onFailure, view, inspection };
  const [low, high] = useMemo(() => {
    let min = Infinity, max = -Infinity;
    for (const note of notes) {
      const x = keyX(note.midi);
      const palm = hasFinger(note) ? x - fingerOffset(note.hand, note.finger!) : x;
      min = Math.min(min, x, palm - 2); max = Math.max(max, x, palm + 2);
    }
    if (!notes.length) { min = -3; max = 4; }
    const count = Math.min(52, Math.max(14, Math.ceil(max - min + 4), Math.min(28, Math.floor(size.width / (size.height || 1) * 4))));
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
    setRect(undefined);
    void import('./pianoScene').then(async ({ makePianoScene }) => {
      if (cancelled) return;
      const piano = makePianoScene(element, low, high, size.width, size.height, latest.current.view, latest.current.inspection);
      scene.current = piano;
      setRect(piano.inputRect);
      piano.update(latest.current.frame, latest.current.down);
      await piano.ready;
      if (!cancelled) setReady(true);
    }).catch(fail);
    return () => {
      cancelled = true;
      element.removeEventListener('webglcontextlost', fail);
      scene.current?.dispose();
      scene.current = null;
    };
  }, [low, high, size]);
  useLayoutEffect(() => {
    if (scene.current) setRect(scene.current.setView(view, inspection));
  }, [view, inspection]);
  useEffect(() => { scene.current?.update(frame, down); }, [frame, down]);

  return <div className="hand-view" data-detail={!!detailHand}
    style={{ '--detail-width': `${(inspection?.fraction ?? 0) * 100}%` } as CSSProperties}>
    <div className="hand-toolbar">
      <div className="hand-main-tools" role="group" aria-label="手部观察视角">
        <button aria-pressed={view === 'player'} onClick={() => setView('player')}>演奏视角</button>
        <button aria-pressed={view === 'overhead'} onClick={() => setView('overhead')}>俯视键位</button>
        <button className="hand-detail-toggle" aria-pressed={!!detailHand} aria-controls="hand-detail" onClick={() =>
          setDetailHand(detailHand ? null : frame.hands.right ? 'right' : 'left')}>拇指特写</button>
      </div>
      {detailHand && <div className="hand-detail" id="hand-detail" aria-label="拇指侧面特写">
        <span className="hand-detail-title">掌下观察</span>
        <div role="group" aria-label="特写手部">
          <button aria-pressed={detailHand === 'left'} onClick={() => setDetailHand('left')}>左手</button>
          <button aria-pressed={detailHand === 'right'} onClick={() => setDetailHand('right')}>右手</button>
        </div>
      </div>}
    </div>
    <div className="hand-stage" ref={stage} aria-busy={!ready}>
      <canvas ref={canvas} aria-hidden="true" />
      {detailHand && <div className="hand-detail-frame" aria-hidden="true" />}
      {detailHand && !frame.hands[detailHand] && <div className="hand-detail-empty" role="status">
        <span>当前没有{detailHand === 'left' ? '左' : '右'}手指法</span>
      </div>}
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
    <div className="hand-bottom">
    <div className="hand-readout" aria-label="当前示范指法">
      {(['left', 'right'] as const).map(hand => {
        const cues = frame.cues.filter(cue => cue.note.hand === hand);
        if (!cues.length) return null;
        return <span key={hand} data-hand={hand}><i />{hand === 'left' ? '左手' : '右手'}
          <b>{cues.map(({ note }) => noteName(note.midi) + (hasFinger(note) ? ' · ' + fingers[note.finger!] : ' · 未标指法')).join('、')}</b></span>;
      })}
      {!frame.cues.length && <span>{motion === 'off' ? '指法提示已隐藏' : '休止'}</span>}
    </div>
    {detailHand && <div className="hand-camera-tools" role="group" aria-label="特写镜头调节">
      <label>高度<input type="range" aria-label="特写观察高度" min="8" max="40" step="1" value={elevation}
        onChange={event => setElevation(Number(event.target.value))} /><output>{elevation}°</output></label>
      <button aria-label={zoom === 1 ? '放大特写' : '还原特写大小'} title={zoom === 1 ? '放大特写' : '还原特写大小'}
        aria-pressed={zoom > 1} onClick={() => setZoom(zoom === 1 ? 1.25 : 1)}>
        {zoom === 1 ? <ZoomIn size={15} /> : <ZoomOut size={15} />}</button>
      <button aria-label="重置特写镜头" title="重置特写镜头" disabled={elevation === 18 && zoom === 1}
        onClick={() => { setElevation(18); setZoom(1); }}><RotateCcw size={14} /></button>
    </div>}
    </div>
  </div>;
}
