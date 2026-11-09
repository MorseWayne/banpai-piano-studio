import type { ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { ChevronDown, Headphones, Minus, Play, Plus, Repeat2, Square, Timer, X } from 'lucide-react';
import type { Hands, Lesson } from './model';
import type { useStudio } from './useStudio';

type Studio = ReturnType<typeof useStudio>;

function ControlPanel({ title, trigger, children }: {
  title: string;
  trigger: ReactNode;
  children: ReactNode;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="tool-button"><span className="sr-only">{title}，</span>{trigger}<ChevronDown size={13} /></button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="control-panel" sideOffset={8} collisionPadding={12} align="end" aria-label={title}>
          <div className="panel-title">
            <h2>{title}</h2>
            <Popover.Close className="icon-button" aria-label="关闭"><X size={17} /></Popover.Close>
          </div>
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function PracticeControls({ studio: s, lesson, barCount, canPlay, onRangeChange }: {
  studio: Studio;
  lesson: Lesson;
  barCount: number;
  canPlay: boolean;
  onRangeChange: () => void;
}) {
  const { settings, setSettings } = s;
  const busy = s.busy || s.status === 'paused';
  const bars = Array.from({ length: barCount }, (_, index) => index);
  function setTempo(bpm: number) {
    setSettings(previous => ({ ...previous, bpm: Math.max(30, Math.min(160, bpm)) }));
  }
  return (
    <div className="practice-controls" aria-label="练习控制" role="group">
      <div className="play-controls">
        <button className="primary-button" disabled={s.loading || (!busy && !canPlay)}
          onClick={() => s.status === 'paused' ? void s.resume() : s.busy ? s.stop() : void s.start()} title="空格键开始或停止">
          {s.busy ? <Square size={15} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          {s.loading ? '准备中…' : s.status === 'paused' ? '继续练习' : s.busy ? '停止' : '开始练习'}
        </button>
        {s.status === 'paused' && <button className="soft-button" onClick={() => s.stop()}>结束本轮</button>}
        <button className="soft-button" disabled={s.loading || busy || !canPlay} onClick={() => void s.start(true)}>
          <Headphones size={17} />听示范
        </button>
      </div>
      <RadioGroup.Root className="segments" aria-label="练习模式" orientation="horizontal" disabled={busy}
        value={settings.mode} onValueChange={value => {
          const mode = value === 'rhythm' ? 'rhythm' : 'wait';
          setSettings(previous => ({ ...previous, mode }));
          s.setMessage(mode === 'wait' ? '弹对当前音符后，乐谱才会继续。' : '听完预备拍后跟着节奏弹奏，结束时可查看提前与滞后次数。');
        }}>
        <RadioGroup.Item value="wait">找音</RadioGroup.Item>
        <RadioGroup.Item value="rhythm">跟拍</RadioGroup.Item>
      </RadioGroup.Root>
      <RadioGroup.Root className="segments" aria-label="练习声部" orientation="horizontal" disabled={busy}
        value={settings.hands} onValueChange={hands => setSettings(previous => ({ ...previous, hands: hands as Hands }))}>
        <RadioGroup.Item value="left" disabled={!lesson.notes.some(note => note.hand === 'left')}>左手</RadioGroup.Item>
        <RadioGroup.Item value="both">双手</RadioGroup.Item>
        <RadioGroup.Item value="right" disabled={!lesson.notes.some(note => note.hand === 'right')}>右手</RadioGroup.Item>
      </RadioGroup.Root>
      <div className="timing-controls">
        <ControlPanel title="速度与节拍" trigger={<><Timer size={17} /><b>{settings.bpm}</b> BPM</>}>
          <div className="tempo-stepper">
            <button className="icon-button" aria-label="降低速度" disabled={busy || settings.bpm <= 30} onClick={() => setTempo(settings.bpm - 2)}><Minus size={16} /></button>
            <strong>{settings.bpm} <small>BPM</small></strong>
            <button className="icon-button" aria-label="提高速度" disabled={busy || settings.bpm >= 160} onClick={() => setTempo(settings.bpm + 2)}><Plus size={16} /></button>
          </div>
          <input className="full-slider" aria-label="练习速度" type="range" min="30" max="160" value={settings.bpm}
            disabled={busy} onChange={event => setTempo(Number(event.target.value))} />
          <div className="panel-actions">
            <button className="text-button" disabled={busy} onClick={() => setTempo(lesson.bpm)}>恢复建议速度 {lesson.bpm}</button>
            <button className="text-button" disabled={busy || s.loading} onClick={() => void s.toggleClick()}>{s.clicking ? '停止听拍' : '单独听拍'}</button>
          </div>
          <label className="field-row">跟拍时播放节拍声<input type="checkbox" checked={settings.metronome} disabled={busy}
            onChange={e => setSettings(previous => ({ ...previous, metronome: e.target.checked }))} /></label>
          <label className="field-row">半拍细分<input type="checkbox" checked={settings.subdivisions} disabled={busy}
            onChange={e => setSettings(previous => ({ ...previous, subdivisions: e.target.checked }))} /></label>
          <label className="field-row">预备拍<select value={settings.countIn} disabled={busy}
            onChange={e => setSettings(previous => ({ ...previous, countIn: Number(e.target.value) }))}>
            <option value={1}>1 小节</option><option value={2}>2 小节</option>
          </select></label>
        </ControlPanel>
        <ControlPanel title="练习片段" trigger={<><Repeat2 size={17} />{settings.loop ? '循环' : '小节'} {settings.startBar + 1}–{settings.endBar + 1}</>}>
          <label className="field-row">起始小节<select value={settings.startBar} disabled={busy} onChange={event => {
            const startBar = Number(event.target.value);
            setSettings(previous => ({ ...previous, startBar, endBar: Math.max(startBar, previous.endBar) }));
            onRangeChange();
          }}>{bars.map(bar => <option key={bar} value={bar}>{bar + 1}</option>)}</select></label>
          <label className="field-row">结束小节<select value={settings.endBar} disabled={busy}
            onChange={e => setSettings(previous => ({ ...previous, endBar: Number(e.target.value) }))}>
            {bars.slice(settings.startBar).map(bar => <option key={bar} value={bar}>{bar + 1}</option>)}
          </select></label>
          <label className="field-row">循环练习此片段<input type="checkbox" checked={settings.loop} disabled={busy}
            onChange={e => setSettings(previous => ({ ...previous, loop: e.target.checked }))} /></label>
        </ControlPanel>
      </div>
    </div>
  );
}
