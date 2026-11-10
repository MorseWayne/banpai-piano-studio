import { useLayoutEffect, useRef } from 'react';
import { beatIndex, type PlaybackView } from './practiceView';
import type { PracticeEngine } from './practiceEngine';

export type ScorePlayback = PlaybackView & Pick<PracticeEngine, 'getScoreTime'>;
export interface BarLayout {
  beats: number[];
  xs: number[];
  system: object;
  left: number;
  top: number;
  bottom: number;
  right: number;
}

// Engraving spaces notes according to their notation, not just their duration.
// Interpolate between actual engraved onsets so the line meets every notehead.
function lineX(bar: BarLayout, next: BarLayout | undefined, beat: number, endBeat: number) {
  const i = Math.max(0, beatIndex(bar.beats, beat));
  const toBeat = bar.beats[i + 1] ?? endBeat;
  const toX = bar.xs[i + 1] ?? next?.xs[0] ?? bar.right;
  const fraction = Math.min(1, Math.max(0, (beat - bar.beats[i]) / (toBeat - bar.beats[i])));
  return bar.xs[i] + (toX - bar.xs[i]) * fraction;
}

export function ScoreTimingGuide({ bars, view, idleBeat, meter, startBar, endBar, showLine, onBarChange }: {
  bars?: Map<number, BarLayout>; view?: ScorePlayback; idleBeat?: number; meter: number;
  startBar: number; endBar: number; showLine: boolean; onBarChange: (bar: number) => void;
}) {
  const line = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const marker = line.current;
    const stage = marker?.parentElement;
    let lastBar = -1;
    let frame = 0;
    function paint() {
      frame = 0;
      const time = view?.getScoreTime();
      const beat = time?.position ?? idleBeat;
      if (beat === undefined) { if (marker) marker.hidden = true; return; }
      const barIndex = Math.min(endBar, Math.floor(beat / meter));
      if (time && lastBar !== barIndex) { lastBar = barIndex; onBarChange(barIndex); }
      const layout = bars?.get(barIndex);
      if (marker && stage) {
        marker.hidden = !layout || !showLine;
        if (layout && showLine) {
          const next = barIndex < endBar ? bars?.get(barIndex + 1) : undefined;
          // Across a system or page break the last beat ends at the barline.
          const sameRow = next?.system === layout.system ? next : undefined;
          let x = lineX(layout, sameRow, beat, (barIndex + 1) * meter);
          if (time?.state === 'counting' && beat === startBar * meter) {
            // Approach the opening note over the final count-in beat.
            x -= Math.min(28, Math.max(0, x - layout.left)) * Math.min(1, time.countIn);
          }
          marker.style.transform = `translate3d(${x}px,${layout.top}px,0)`;
          const height = `${layout.bottom - layout.top}px`;
          if (marker.style.height !== height) marker.style.height = height;
          const state = time?.state ?? 'idle';
          if (marker.dataset.state !== state) marker.dataset.state = state;
          if (stage.scrollWidth > stage.clientWidth && (x < stage.scrollLeft || x > stage.scrollLeft + stage.clientWidth - 6)) {
            stage.scrollLeft = Math.max(0, x - stage.clientWidth / 3);
          }
          if (layout.top < stage.scrollTop || layout.bottom > stage.scrollTop + stage.clientHeight) {
            stage.scrollTop = layout.top;
          }
        }
      }
      if (time?.state === 'playing' || time?.state === 'counting') wake();
    }
    function wake() { if (!frame) frame = requestAnimationFrame(paint); }
    paint();
    const unsubscribe = view?.subscribe(wake);
    return () => { unsubscribe?.(); cancelAnimationFrame(frame); };
  }, [bars, view, idleBeat, meter, startBar, endBar, showLine, onBarChange]);
  return <span ref={line} className="score-playhead" aria-hidden="true" hidden />;
}
