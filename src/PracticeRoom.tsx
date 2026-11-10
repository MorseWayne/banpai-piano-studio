import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowRight, BookOpen, Box, CheckCircle2, ChevronRight, KeyboardMusic, ListMusic, Music2, X } from 'lucide-react';
import { Score } from './Score';
import { Keyboard } from './Keyboard';
import { HandKeyboard } from './HandKeyboard';
import { read, save } from './storage';
import { groupNotes, matchesHand, type Lesson, type Note } from './model';
import { PracticeControls } from './PracticeControls';
import type { useStudio } from './useStudio';
import { LessonProgress, type CourseProgress } from './LessonProgress';

type Studio = ReturnType<typeof useStudio>;
type InstrumentProps = { studio: Studio; selected: Note[]; inspected: Note[] };
const noNotes: Note[] = [];
const noIds: string[] = [];
const noHits = new Set<string>();

function useTargets({ studio: s, selected, inspected }: InstrumentProps) {
  const { engine, settings, status } = s;
  const active = useSyncExternalStore(engine.subscribe, () => settings.hints ? engine.getSnapshot().active : noIds);
  return useMemo(() => {
    if (!settings.hints) return noNotes;
    if (!s.busy && status !== 'paused' && inspected.length) return inspected;
    if (status === 'idle' || (status === 'counting' && !active.length)) return groupNotes(selected)[0] ?? noNotes;
    return selected.filter(note => active.includes(note.id));
  }, [settings.hints, s.busy, status, inspected, selected, active]);
}

function PracticeSheet({ studio: s, lesson, selected, inspected, browseBar, onBrowse, onInspect }: InstrumentProps & {
  lesson: Lesson; browseBar: number | null; onBrowse: (bar: number | null) => void; onInspect: (notes: Note[]) => void;
}) {
  const { engine, settings } = s;
  const targets = useTargets({ studio: s, selected, inspected });
  const hits = useSyncExternalStore(engine.subscribe, () => engine.getSnapshot().hits);
  const following = s.busy || s.status === 'paused';
  const showCursor = settings.hints || settings.mode === 'rhythm' || s.status === 'demo';
  const cursorBeat = following ? undefined : inspected[0]?.beat ?? targets[0]?.beat;
  return <Score lesson={lesson} focusBar={browseBar ?? settings.startBar} startBar={settings.startBar} cursorBeat={cursorBeat}
    follow={following ? { view: engine, endBar: settings.endBar, showCursor } : undefined}
    active={targets} hits={hits} inspected={inspected} hands={settings.hands} busy={following} onBrowse={onBrowse}
    onPreview={notes => { onInspect(notes); void s.previewNotes(notes); }}
    onBar={startBar => {
      onBrowse(null);
      s.setSettings(previous => ({ ...previous, startBar, endBar: Math.max(startBar, previous.endBar) }));
    }} />;
}

function BeatCounter({ studio: s, meter }: { studio: Studio; meter: number }) {
  const beat = useSyncExternalStore(s.clicking ? s.clickBeat.subscribe : s.engine.subscribe,
    s.clicking ? s.clickBeat.getSnapshot : () => s.engine.getSnapshot().beat);
  return <div className="beat-counter" aria-label="当前节拍">
    {Array.from({ length: meter }, (_, i) => <span key={i} className={beat === i ? 'on' : ''}>{i + 1}</span>)}
  </div>;
}

function PracticeKeys({ studio: s, selected, inspected, showHands, low, high, onFailure }: InstrumentProps & {
  showHands: boolean; low: number; high: number; onFailure: () => void;
}) {
  const targets = useTargets({ studio: s, selected, inspected });
  const down = useSyncExternalStore(s.down.subscribe, s.down.getSnapshot);
  const hits = useSyncExternalStore(s.engine.subscribe, () => showHands ? s.engine.getSnapshot().hits : noHits);
  const preview = !s.busy && s.status !== 'paused' && inspected.length > 0;
  const handNotes = useMemo(() => preview ? [...selected, ...inspected] : selected, [preview, selected, inspected]);
  if (!showHands) return <Keyboard down={down} target={targets} onDown={note => s.onDown(note)} onUp={s.onUp} low={low} high={high} />;
  return <HandKeyboard notes={handNotes} target={targets} down={down} hits={hits} playback={s.engine}
    motion={!s.settings.hints ? 'off' : s.status === 'demo' || (s.status === 'running' && s.settings.mode === 'rhythm')
      ? 'timed' : s.status === 'running' ? 'wait' : 'preview'}
    onDown={s.onDown} onUp={s.onUp} onFailure={onFailure} />;
}

export function PracticeRoom({ lesson, studio: s, onCourses, onHistory, onLearning, progress, onNext }: {
  lesson: Lesson;
  studio: ReturnType<typeof useStudio>;
  onCourses: () => void;
  onHistory: () => void;
  onLearning: () => void;
  progress?: CourseProgress;
  onNext: () => void;
}) {
  const [guide, setGuide] = useState(false);
  const [browseBar, setBrowseBar] = useState<number | null>(null);
  const [inspected, setInspected] = useState<Note[]>([]);
  const [showHands, setShowHands] = useState(() => read<boolean>('showHands', false) === true);
  const [handError, setHandError] = useState(false);
  const { settings } = s;
  const barCount = Math.ceil(lesson.beats / lesson.meter);
  const selected = useMemo(() => lesson.notes.filter(note => matchesHand(note, settings.hands)
    && note.beat >= settings.startBar * lesson.meter && note.beat < (settings.endBar + 1) * lesson.meter),
    [lesson, settings.hands, settings.startBar, settings.endBar]);
  const low = Math.min(48, ...lesson.notes.map(note => note.midi));
  const high = Math.max(72, ...lesson.notes.map(note => note.midi));
  const canPlay = selected.length > 0;
  const result = s.result;
  const resultSummary = result && <section className="result-strip" aria-label="本轮结果">
    <b>本轮结果</b><span>命中 {result.hit}/{result.total}</span><span>错音 {result.wrong}</span>
    {result.mode === 'rhythm' && <><span>提前 {result.early} · 滞后 {result.late}</span><span>时值偏差 {result.durationErrors}</span></>}
    <button className="text-button" onClick={onHistory}>查看记录<ArrowRight size={15} /></button>
  </section>;
  const playback = useRef({ studio: s, canPlay });
  playback.current = { studio: s, canPlay };
  useEffect(() => { setInspected([]); }, [s.busy, browseBar, settings.startBar, settings.endBar, settings.hands, settings.hints]);

  // Let focused controls and open Radix layers own their keyboard events.
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      const { studio, canPlay } = playback.current;
      if (event.code !== 'Space' || event.repeat || event.defaultPrevented ||
        event.altKey || event.ctrlKey || event.metaKey || studio.loading || document.querySelector('[role="dialog"]')) return;
      if (event.target instanceof Element && event.target.closest('button, input, select, textarea, a, summary, video, [contenteditable="true"]')) return;
      event.preventDefault();
      if (studio.busy) studio.stop();
      else if (studio.status === 'paused') void studio.resume();
      else if (canPlay) void studio.start();
    }
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);

  return (
    <>
      <div className="lesson-heading">
        <div>
          <div className="lesson-path"><button onClick={onCourses}>切换练习</button><ChevronRight size={13} />{lesson.stage}</div>
          <h1>{lesson.title}</h1>
          <p>{lesson.subtitle}</p>
        </div>
        <button className="soft-button guide-toggle" aria-expanded={guide} aria-controls="lesson-guide" onClick={() => { if (!guide) s.pause(); setGuide(!guide); }}>
          <BookOpen size={16} />本课要点
        </button>
      </div>
      <PracticeControls studio={s} lesson={lesson} barCount={barCount} canPlay={canPlay} onRangeChange={() => setBrowseBar(null)} />
      <div className={'music-desk' + (guide ? ' with-guide' : '')}>
        <div className="instrument">
          <PracticeSheet studio={s} lesson={lesson} selected={selected} inspected={inspected}
            browseBar={browseBar} onBrowse={setBrowseBar} onInspect={setInspected} />
          <div className="live-feedback">
            {result && s.status === 'finished' && progress ? <LessonProgress compact lesson={lesson} progress={progress}
              onNext={onNext} onCourses={onCourses} onStudy={onLearning}>{resultSummary}</LessonProgress> : <><div role="status">{result ? <CheckCircle2 size={17} /> : <Music2 size={17} />}
              {canPlay ? s.message : '当前片段没有所选声部的音符。请切换声部或小节。'}
            </div>
            <BeatCounter studio={s} meter={lesson.meter} /></>}
          </div>
          <section className="keyboard-deck" aria-label="屏幕琴键">
            <div className="keyboard-heading"><h2><KeyboardMusic size={17} />屏幕琴键</h2>
              <span className="keyboard-source">{s.device?.name || '点击弹奏'}</span>
              {s.device && <span className="pedal-state">踏板{s.pedal ? '按下' : '松开'}</span>}
              <button className="hand-toggle" aria-pressed={showHands} onClick={() => {
                setShowHands(!showHands); setHandError(false); save('showHands', !showHands);
              }}><Box size={14} />3D 指法</button>
              <label><input type="checkbox" checked={settings.hints} onChange={event => {
                const hints = event.target.checked;
                s.setSettings(previous => ({ ...previous, hints }));
              }} />目标音提示</label>
            </div>
            {handError && <p className="hand-error" role="alert">立体视图加载失败，已切回普通琴键。</p>}
            <PracticeKeys studio={s} selected={selected} inspected={inspected} showHands={showHands} low={low} high={high}
              onFailure={() => { setShowHands(false); setHandError(true); save('showHands', false); }} />
          </section>
          {(!progress || s.status !== 'finished') && resultSummary}
        </div>
        {guide && <aside id="lesson-guide" className="guide">
          <div className="panel-title"><h2><BookOpen size={17} />本课要点</h2><button className="icon-button" aria-label="收起本课要点" onClick={() => setGuide(false)}><X size={17} /></button></div>
          <section><h3>{lesson.theory.title}</h3><p>{lesson.theory.body}</p><p className="music-example">{lesson.theory.example}</p></section>
          <section><h3>动作提醒</h3><p>{lesson.tip}</p></section>
          <button className="soft-button" onClick={onLearning}>查看完整讲解<ArrowRight size={15} /></button>
        </aside>}
      </div>
      <div className="practice-footnote"><ListMusic size={15} />{lesson.source} · {barCount} 小节 · {lesson.meter}/4 拍<span>已选 {selected.length} 个音</span></div>
    </>
  );
}
