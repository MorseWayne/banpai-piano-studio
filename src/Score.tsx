import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { OpenSheetMusicDisplay, VexFlowGraphicalNote } from 'opensheetmusicdisplay';
import { ChevronLeft, ChevronRight, Headphones, Music2 } from 'lucide-react';
import { groupNotes, type Hands, type Lesson, type Note } from './model';
import { divisions, scoreMusicXml, writtenPitch } from './scoreMusicXml';
import { usePlaybackPosition } from './practiceView';
import { ScoreTimingGuide, type BarLayout, type ScorePlayback } from './ScoreTimingGuide';
import { read, save } from './storage';

interface ScoreProps {
  purpose?: 'practice' | 'study';
  lesson: Lesson;
  focusBar: number;
  startBar: number;
  cursorBeat: number | undefined;
  follow?: { view: ScorePlayback; endBar: number; showCursor: boolean };
  active: Note[];
  hits: Set<string>;
  hands: Hands;
  busy: boolean;
  onPreview: (notes: Note[]) => void;
  onBrowse: (bar: number) => void;
  onBar: (bar: number) => void;
}

function describe(notes: Note[], meter: number) {
  const first = notes[0];
  const bar = Math.floor(first.beat / meter);
  const beat = Number((first.beat - bar * meter + 1).toFixed(2));
  const parts = [...new Set(notes.map(note => note.hand))].map(hand => {
    const pitches = notes.filter(note => note.hand === hand).map(note => {
      const { step, alter, octave } = writtenPitch(note);
      return step + ['♭', '', '♯'][alter + 1] + octave + (note.finger ? `（${note.finger} 指）` : '');
    }).join('、');
    return `${hand === 'right' ? '右手' : '左手'} ${pitches}`;
  });
  return `第 ${bar + 1} 小节 · 第 ${beat} 拍 · ${parts.join(' · ')}`;
}

function indexPage(display: OpenSheetMusicDisplay, lesson: Lesson, firstBar: number, count: number, stage: HTMLElement) {
  const groups = new Map<string, { notes: Note[]; graphic: VexFlowGraphicalNote; element: SVGGElement }>();
  const bars = new Map<number, BarLayout>();
  const bounds = stage.getBoundingClientRect();
  const left = bounds.left - stage.scrollLeft, top = bounds.top - stage.scrollTop;
  for (const staves of display.GraphicSheet.MeasureList) {
    const bar = staves[0].MeasureNumber - 1;
    if (bar < firstBar || bar >= firstBar + count) continue;
    const start = bar * lesson.meter;
    const columns = new Map<number, number>();
    const staveBounds = staves.map(measure => {
      const group = measure.getSVGGElement();
      return (group?.querySelector('.vf-stave') ?? group)?.getBoundingClientRect();
    }).filter(rect => rect && rect.width > 0);
    staves.forEach((measure, staff) => {
      const hand = staff === 0 ? 'right' : 'left';
      const events = groupNotes(lesson.notes.filter(note => note.hand === hand && note.beat >= start && note.beat < start + lesson.meter));
      const byTime = new Map(events.map(notes => [Math.round(notes[0].beat * divisions), notes]));
      for (const entry of measure.staffEntries) {
        for (const voice of entry.graphicalVoiceEntries) {
          const graphic = voice.notes[0] as VexFlowGraphicalNote | undefined;
          if (!graphic) continue;
          const tick = Math.round(graphic.sourceNote.getAbsoluteTimestamp().RealValue * 4 * divisions);
          const rest = graphic.sourceNote.isRest();
          // A whole-measure rest sits in the middle of its staff, even if the
          // other hand plays at beat one. It is not a spatial timing anchor.
          if (!rest || (!graphic.sourceNote.isWholeRest() && !columns.has(tick))) {
            const head = (graphic.getNoteheadSVGs()[0] ?? graphic.getSVGGElement())?.getBoundingClientRect();
            if (head?.width) columns.set(tick, head.left + head.width / 2 - left);
          }
          if (rest) continue;
          const notes = byTime.get(tick);
          const element = graphic.getSVGGElement();
          if (!element || !notes) continue;
          const id = notes[0].id;
          element.dataset.scoreEvent = id;
          element.setAttribute('role', 'button');
          element.setAttribute('aria-label', '试听' + describe(notes, lesson.meter));
          groups.set(id, { notes, graphic, element });
        }
      }
    });
    if (staveBounds.length) {
      const first = staveBounds[0], last = staveBounds[staveBounds.length - 1];
      if (!columns.has(start * divisions)) {
        columns.set(start * divisions, first.left - left + staves[0].beginInstructionsWidth * 10 * display.Zoom);
      }
      const sorted = [...columns].sort(([a], [b]) => a - b);
      bars.set(bar, { beats: sorted.map(([tick]) => tick / divisions), xs: sorted.map(([, x]) => x),
        system: staves[0].ParentMusicSystem, left: first.left - left,
        top: Math.max(2, first.top - top - 7), bottom: last.bottom - top + 3, right: first.right - left });
    }
  }
  return { groups, bars };
}

export function Score({ purpose = 'practice', lesson, focusBar, startBar, cursorBeat, follow, active, hits, hands, busy, onPreview, onBrowse, onBar }: ScoreProps) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [timingGuide, setTimingGuide] = useState(() => read('scoreTimingGuide', true));
  const [timingBar, setTimingBar] = useState(startBar);
  const [display, setDisplay] = useState<OpenSheetMusicDisplay>();
  const [page, setPage] = useState<ReturnType<typeof indexPage>>();
  const [error, setError] = useState('');
  const total = Math.ceil(lesson.beats / lesson.meter);
  const perPage = width / zoom < 555 ? 1 : 2;
  const pageStart = (bar: number) => Math.floor(Math.min(total - 1, bar) / perPage) * perPage;
  const endBar = follow?.endBar ?? total - 1;
  const guided = !!follow && timingGuide;
  const guideEnabled = purpose === 'study' || timingGuide;
  const bar = usePlaybackPosition(guided ? undefined : follow?.view,
    position => pageStart(Math.min(endBar, Math.floor(position / lesson.meter))),
    pageStart(guided ? Math.min(endBar, Math.max(startBar, timingBar)) : focusBar));
  const count = Math.min(perPage, total - bar);

  useEffect(() => {
    const element = host.current!;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loaded = false;
    let instance: OpenSheetMusicDisplay | undefined;
    const mount = document.createElement('div');
    host.current!.appendChild(mount);
    async function load() {
      try {
        const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');
        if (cancelled) return;
        instance = new OpenSheetMusicDisplay(mount, {
          backend: 'svg', autoResize: false, autoBeam: true, drawTitle: false, drawPartNames: false,
          drawCredits: false, drawMeasureNumbers: true, drawMeasureNumbersOnlyAtSystemStart: false, measureNumberInterval: 1,
          drawMetronomeMarks: false, drawFingerings: true, stretchLastSystemLine: true,
          defaultColorMusic: '#26352f', defaultColorRest: '#858e88', disableCursor: true,
        });
        const rules = instance.EngravingRules;
        rules.PageTopMargin = 1.2;
        rules.PageBottomMargin = 1;
        rules.PageLeftMargin = 1.5;
        rules.PageRightMargin = 1.5;
        await instance.load(scoreMusicXml(lesson));
        if (!cancelled) setDisplay(instance);
      } catch (cause) {
        if (!cancelled) setError(String(cause));
      } finally {
        loaded = true;
        if (cancelled) instance?.dispose();
      }
    }
    void load();
    return () => {
      cancelled = true;
      if (loaded) instance?.dispose();
      mount.remove();
    };
  }, [lesson]);

  useLayoutEffect(() => {
    if (!display || !width) return;
    try {
      display.Zoom = zoom;
      display.setOptions({ drawFromMeasureNumber: bar + 1, drawUpToMeasureNumber: bar + count });
      display.render();
      setPage(indexPage(display, lesson, bar, count, host.current!));
      setError('');
    } catch (cause) {
      setPage(undefined);
      setError(String(cause));
    }
  }, [display, bar, count, width, zoom, lesson]);

  useLayoutEffect(() => {
    if (!page) return;
    const expected = new Set(active.map(note => note.id));
    for (const { notes, graphic, element } of page.groups.values()) {
      const hand = notes[0].hand;
      const color = hands !== 'both' && hands !== hand ? '#adb5ae'
        : notes.some(note => expected.has(note.id)) ? '#b75a18'
        : notes.every(note => hits.has(note.id)) ? '#237253'
        : hand === 'right' ? '#344d82' : '#71598c';
      if (element.dataset.ink !== color) {
        graphic.setColor(color, { applyToBeams: false, applyToLedgerLines: false });
        element.dataset.ink = color;
      }
      if (element.getAttribute('aria-disabled') !== String(busy)) {
        element.setAttribute('tabindex', busy ? '-1' : '0');
        element.setAttribute('aria-disabled', String(busy));
      }
    }
  }, [page, active, hands, hits, busy]);

  function preview(target: EventTarget | null) {
    if (busy || !(target instanceof Element)) return;
    const id = target.closest<SVGElement>('[data-score-event]')?.dataset.scoreEvent;
    const group = id && page?.groups.get(id);
    if (group) onPreview(group.notes);
  }
  return <section className="sheet" aria-label={purpose === 'study' ? '示范乐谱' : '练习乐谱'}>
    <div className="sheet-heading">
      <h2><Music2 size={16} />{purpose === 'study' ? '示范乐谱' : '练习乐谱'}</h2>
      <div className="score-legend"><span><i className="right" />右手</span><span><i className="left" />左手</span></div>
      <div className="sheet-tools">
        {purpose === 'practice' && <button className="timing-toggle" aria-pressed={timingGuide}
          title="竖线碰到音符头时按键"
          onClick={() => { setTimingGuide(!timingGuide); save('scoreTimingGuide', !timingGuide); }}>节拍线</button>}
        <select aria-label="谱面大小" value={zoom} onChange={event => setZoom(Number(event.target.value))}>
          <option value={0.85}>85%</option><option value={1}>100%</option><option value={1.25}>125%</option>
        </select>
        <div className="page-arrows">
          <button className="icon-button" aria-label="上一页乐谱" disabled={busy || bar === 0} onClick={() => onBrowse(bar - perPage)}><ChevronLeft size={16} /></button>
          <span>{count === 1 ? bar + 1 : `${bar + 1}–${bar + count}`} / {total} 小节</span>
          <button className="icon-button" aria-label="下一页乐谱" disabled={busy || bar + count >= total} onClick={() => onBrowse(bar + count)}><ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
    <div className="score-stage" ref={host} role="group" aria-label={`${lesson.title}，钢琴大谱表`}
      onClick={event => preview(event.target)} onKeyDown={event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault(); event.stopPropagation();
        if (!event.repeat) preview(event.target);
      }}>
      {guideEnabled && <ScoreTimingGuide view={follow?.view} idleBeat={cursorBeat} bars={page?.bars} meter={lesson.meter}
        startBar={startBar} endBar={endBar} onBarChange={setTimingBar} showLine={follow?.showCursor ?? true} />}
    </div>
    {error && <p className="error" role="alert">谱面加载失败。{error}</p>}
    <div className="sheet-footer">
      {purpose === 'study' && <span className="score-audition"><Headphones size={15} />{active.length
        ? `${describe(active, lesson.meter)} · 持续 ${active[0].duration} 拍` : '点音符试听'}</span>}
      <div className="bar-labels" role="group" aria-label={purpose === 'study' ? '浏览小节' : '选择起练小节'}><span>{purpose === 'study' ? '定位' : '起练'}</span>
        {Array.from({ length: count }, (_, i) => <button key={bar + i} disabled={busy} aria-pressed={startBar === bar + i}
          title={purpose === 'study' ? '查看这一小节' : '从这一小节开始练习'} onClick={() => onBar(bar + i)}>第 {bar + i + 1} 小节</button>)}
      </div>
    </div>
  </section>;
}
