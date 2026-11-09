import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Box, CheckCircle2, ChevronRight, KeyboardMusic, ListMusic, Music2, X } from 'lucide-react';
import { Fingering } from './components';
import { Score } from './Score';
import { Keyboard } from './Keyboard';
import { HandKeyboard } from './HandKeyboard';
import { read, save } from './storage';
import { matchesHand, type Lesson, type Note } from './model';
import { PracticeControls } from './PracticeControls';
import type { useStudio } from './useStudio';

export function PracticeRoom({ lesson, studio: s, onCourses, onHistory, video, onVideo }: {
  lesson: Lesson;
  studio: ReturnType<typeof useStudio>;
  onCourses: () => void;
  onHistory: () => void;
  video: string;
  onVideo: (file: File) => void;
}) {
  const [guide, setGuide] = useState(false);
  const [browseBar, setBrowseBar] = useState<number | null>(null);
  const [inspected, setInspected] = useState<Note[]>([]);
  const [showHands, setShowHands] = useState(() => read<boolean>('showHands', false) === true);
  const [handError, setHandError] = useState(false);
  const { settings } = s;
  const barCount = Math.ceil(lesson.beats / lesson.meter);
  const focusBar = s.busy ? Math.min(settings.endBar, Math.floor(s.position / lesson.meter)) : browseBar ?? settings.startBar;
  const selected = useMemo(() => lesson.notes.filter(note => matchesHand(note, settings.hands)
    && note.beat >= settings.startBar * lesson.meter && note.beat < (settings.endBar + 1) * lesson.meter),
    [lesson, settings.hands, settings.startBar, settings.endBar]);
  const low = Math.min(48, ...lesson.notes.map(note => note.midi));
  const high = Math.max(72, ...lesson.notes.map(note => note.midi));
  const preview = !s.busy && inspected.length > 0;
  const handNotes = useMemo(() => preview ? [...selected, ...inspected] : selected, [preview, selected, inspected]);
  const targets = settings.hints ? (preview ? inspected : s.target) : [];
  const cursorBeat = s.busy && (settings.hints || settings.mode === 'rhythm' || s.status === 'demo') ? s.position
    : preview ? inspected[0].beat : targets[0]?.beat;
  const canPlay = selected.length > 0;
  const result = s.result;
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
        <button className="soft-button guide-toggle" aria-expanded={guide} aria-controls="lesson-guide" onClick={() => setGuide(!guide)}>
          <BookOpen size={16} />练习指导
        </button>
      </div>
      <PracticeControls studio={s} lesson={lesson} barCount={barCount} canPlay={canPlay} onRangeChange={() => setBrowseBar(null)} />
      <div className={'music-desk' + (guide ? ' with-guide' : '')}>
        <div className="instrument">
          <Score lesson={lesson} focusBar={focusBar} startBar={settings.startBar} cursorBeat={cursorBeat}
            active={targets} hits={s.hits} inspected={inspected} hands={settings.hands} busy={s.busy} onBrowse={setBrowseBar}
            onPreview={notes => { setInspected(notes); void s.previewNotes(notes); }}
            onBar={startBar => {
              setBrowseBar(null);
              s.setSettings(previous => ({ ...previous, startBar, endBar: Math.max(startBar, previous.endBar) }));
            }} />
          <div className="live-feedback">
            <div role="status">{result ? <CheckCircle2 size={17} /> : <Music2 size={17} />}
              {canPlay ? s.message : '当前片段没有所选声部的音符。请切换声部或小节。'}
            </div>
            <div className="beat-counter" aria-label="当前节拍">
              {Array.from({ length: lesson.meter }, (_, i) => <span key={i} className={s.beat === i ? 'on' : ''}>{i + 1}</span>)}
            </div>
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
            {showHands ? <HandKeyboard notes={handNotes} target={targets} down={s.down} hits={s.hits} beat={s.position}
              motion={!settings.hints ? 'off' : s.status === 'demo' || (s.status === 'running' && settings.mode === 'rhythm')
                ? 'timed' : s.status === 'running' ? 'wait' : 'preview'}
              onDown={s.onDown} onUp={s.onUp} onFailure={() => { setShowHands(false); setHandError(true); save('showHands', false); }} />
              : <Keyboard down={s.down} target={targets} onDown={note => s.onDown(note)} onUp={s.onUp}
                low={low} high={high} />}
          </section>
          {result && <section className="result-strip" aria-label="本轮结果">
            <b>本轮结果</b><span>命中 {result.hit}/{result.total}</span><span>错音 {result.wrong}</span>
            {result.mode === 'rhythm' && <><span>提前 {result.early} · 滞后 {result.late}</span><span>时值偏差 {result.durationErrors}</span></>}
            <button className="text-button" onClick={onHistory}>查看记录<ArrowRight size={15} /></button>
          </section>}
        </div>
        {guide && <aside id="lesson-guide" className="guide">
          <div className="panel-title"><h2><BookOpen size={17} />练习指导</h2><button className="icon-button" aria-label="收起练习指导" onClick={() => setGuide(false)}><X size={17} /></button></div>
          <section><h3>{lesson.theory.title}</h3><p>{lesson.theory.body}</p><p className="music-example">{lesson.theory.example}</p></section>
          <Fingering notes={targets} tip={lesson.tip} video={video} onVideo={onVideo} />
          <details><summary>练习前的提醒</summary><p>调整座椅高度，让手肘接近琴键，肩膀自然放松。指法 1 到 5 从拇指排到小指。图示是建议指法，MIDI 无法识别实际手型。</p></details>
        </aside>}
      </div>
      <div className="practice-footnote"><ListMusic size={15} />{lesson.source} · {barCount} 小节 · {lesson.meter}/4 拍<span>已选 {selected.length} 个音</span></div>
    </>
  );
}
