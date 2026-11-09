import { useEffect, useRef, useState } from 'react';
import { Piano } from '@audio-ui/react/piano';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { noteName, type Note } from './model';

// Prefer complete octaves around middle C; keep imported scores playable out to A0–C8.
const sizes = [
  { whiteKeys: 52, low: 21, high: 108 },
  { whiteKeys: 36, low: 36, high: 96 },
  { whiteKeys: 29, low: 36, high: 84 },
  { whiteKeys: 22, low: 48, high: 84 },
];
const minKeyWidth = 22;

export function Keyboard({ down, target, onDown, onUp, low, high }: {
  down: Set<number>;
  target: Note[];
  onDown: (pitch: number) => void;
  onUp: (pitch: number) => void;
  low: number;
  high: number;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const size = sizes.find(size => size.whiteKeys * minKeyWidth <= width);
  const minPitch = Math.min(size?.low ?? 48, Math.max(21, Math.floor(low / 12) * 12));
  const maxPitch = Math.max(size?.high ?? 72, Math.min(108, Math.ceil(high / 12) * 12));
  const whiteKeys = 1 + Math.round((maxPitch - minPitch) * 7 / 12);
  const minWidth = whiteKeys * minKeyWidth;
  const canScroll = width > 0 && minWidth > width;
  const firstTarget = target[0]?.midi;

  function revealKey(key: Element) {
    const element = viewport.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const keyBounds = key.getBoundingClientRect();
    if (keyBounds.left < bounds.left || keyBounds.right > bounds.right) {
      element.scrollLeft += keyBounds.left - bounds.left - (bounds.width - keyBounds.width) / 2;
    }
  }
  useEffect(() => {
    if (!canScroll || firstTarget === undefined) return;
    const key = viewport.current?.querySelector(`[data-midi="${firstTarget}"]`);
    if (key) revealKey(key);
  }, [canScroll, firstTarget, width]);

  return (
    <div className="keybed-frame">
      <div className="keybed-viewport" ref={viewport} onFocusCapture={event => revealKey(event.target)}>
        <Piano.Root className="keybed" aria-label="钢琴键盘" minPitch={minPitch} maxPitch={maxPitch}
          style={{ minWidth }} activeNotes={[...down]} onNoteOn={onDown} onNoteOff={onUp}>
          <Piano.Keys>{pitch => {
            const hint = target.find(note => note.midi === pitch);
            return <Piano.Key pitch={pitch} data-midi={pitch} data-hand={hint?.hand} aria-label={`${noteName(pitch)} 琴键`}
              className={({ color }) => `key key-${color}`}>
              {hint?.finger && <span aria-hidden="true" className="finger-number">{hint.finger}</span>}
              {(pitch % 12 === 0 || hint) && <Piano.KeyLabel className="pitch-name" />}
            </Piano.Key>;
          }}</Piano.Keys>
        </Piano.Root>
      </div>
      {canScroll && <div className="keybed-scroll">
        <button aria-label="向低音区滚动" onClick={() => viewport.current?.scrollBy({ left: -width * 0.75 })}><ChevronLeft size={15} />低音区</button>
        <button aria-label="向高音区滚动" onClick={() => viewport.current?.scrollBy({ left: width * 0.75 })}>高音区<ChevronRight size={15} /></button>
      </div>}
    </div>
  );
}
