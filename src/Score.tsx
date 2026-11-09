import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { OpenSheetMusicDisplay, VexFlowGraphicalNote } from 'opensheetmusicdisplay';
import { ChevronLeft, ChevronRight, Headphones, Music2 } from 'lucide-react';
import { groupNotes, type Hands, type Lesson, type Note } from './model';
import { divisions, scoreMusicXml, writtenPitch } from './scoreMusicXml';

interface ScoreProps {
  purpose?: 'practice' | 'study';
  lesson: Lesson;
  focusBar: number;
  startBar: number;
  cursorBeat: number | undefined;
  active: Note[];
  hits: Set<string>;
  hands: Hands;
  busy: boolean;
  inspected: Note[];
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

interface DrawnGroup { notes: Note[]; graphic: VexFlowGraphicalNote; element: SVGGElement }

function indexPage(display: OpenSheetMusicDisplay, lesson: Lesson, firstBar: number, count: number) {
  const groups = new Map<string, DrawnGroup>();
  for (const staves of display.GraphicSheet.MeasureList) {
    staves.forEach((measure, staff) => {
      const bar = measure.MeasureNumber - 1;
      if (bar < firstBar || bar >= firstBar + count) return;
      const hand = staff === 0 ? 'right' : 'left';
      const start = bar * lesson.meter;
      const events = groupNotes(lesson.notes.filter(note => note.hand === hand && note.beat >= start && note.beat < start + lesson.meter));
      const byTime = new Map(events.map(notes => [Math.round(notes[0].beat * divisions), notes]));
      for (const entry of measure.staffEntries) {
        for (const voice of entry.graphicalVoiceEntries) {
          const graphic = voice.notes[0] as VexFlowGraphicalNote | undefined;
          if (!graphic || graphic.sourceNote.isRest()) continue;
          const tick = Math.round(graphic.sourceNote.getAbsoluteTimestamp().RealValue * 4 * divisions);
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
  }
  const cursor = display.cursor;
  cursor.hide();
  cursor.reset();
  const beats: number[] = [];
  while (!cursor.Iterator.EndReached && cursor.Iterator.CurrentMeasureIndex < firstBar + count) {
    beats.push(cursor.Iterator.CurrentSourceTimestamp.RealValue * 4);
    cursor.next();
  }
  cursor.reset();
  return { groups, beats, cursor };
}

export function Score({ purpose = 'practice', lesson, focusBar, startBar, cursorBeat, active, hits, hands, busy, inspected, onPreview, onBrowse, onBar }: ScoreProps) {
  const host = useRef<HTMLDivElement>(null);
  const cursorStep = useRef(0);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [display, setDisplay] = useState<OpenSheetMusicDisplay>();
  const [page, setPage] = useState<ReturnType<typeof indexPage>>();
  const [error, setError] = useState('');
  const total = Math.ceil(lesson.beats / lesson.meter);
  const perPage = width / zoom < 555 ? 1 : 2;
  const bar = Math.floor(Math.min(total - 1, focusBar) / perPage) * perPage;
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
          defaultColorMusic: '#26352f', defaultColorRest: '#858e88', followCursor: false,
          cursorsOptions: [{ type: 0, color: '#d78735', alpha: 0.33, follow: false }],
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
      setPage(indexPage(display, lesson, bar, count));
      cursorStep.current = 0;
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

  const nextStep = page?.beats.findIndex(beat => beat > (cursorBeat ?? 0) + 0.00001) ?? -1;
  const step = page ? (nextStep < 0 ? page.beats.length - 1 : Math.max(0, nextStep - 1)) : 0;
  const showCursor = cursorBeat !== undefined && cursorBeat >= bar * lesson.meter && cursorBeat < (bar + count) * lesson.meter;
  useLayoutEffect(() => {
    if (!page) return;
    if (!showCursor || !page.beats.length) { page.cursor.hide(); return; }
    if (step < cursorStep.current) { page.cursor.reset(); cursorStep.current = 0; }
    while (cursorStep.current < step) { page.cursor.next(); cursorStep.current++; }
    page.cursor.show();
    const stage = host.current;
    if (stage && stage.scrollWidth > stage.clientWidth) {
      const position = page.cursor.cursorElement.getBoundingClientRect();
      const bounds = stage.getBoundingClientRect();
      if (position.right > bounds.right || position.left < bounds.left) {
        stage.scrollLeft += position.left - bounds.left - bounds.width / 3;
      }
    }
  }, [page, step, showCursor]);

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
      }} />
    {error && <p className="error" role="alert">谱面加载失败。{error}</p>}
    <div className="sheet-footer">
      <span className="score-audition"><Headphones size={15} />{busy ? (showCursor ? '跟随光标读谱' : '独立读谱') : inspected.length ? describe(inspected, lesson.meter) : '点音符试听'}</span>
      <div className="bar-labels" role="group" aria-label={purpose === 'study' ? '浏览小节' : '选择起练小节'}><span>{purpose === 'study' ? '定位' : '起练'}</span>
        {Array.from({ length: count }, (_, i) => <button key={bar + i} disabled={busy} aria-pressed={startBar === bar + i}
          title={purpose === 'study' ? '查看这一小节' : '从这一小节开始练习'} onClick={() => onBar(bar + i)}>第 {bar + i + 1} 小节</button>)}
      </div>
    </div>
  </section>;
}
