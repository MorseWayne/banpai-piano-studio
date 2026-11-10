import * as Dialog from '@radix-ui/react-dialog';
import { Cable, RefreshCw, Volume2, X } from 'lucide-react';
import { piano } from './audio';
import type { useStudio } from './useStudio';

export function DeviceSettings({ studio: s }: { studio: ReturnType<typeof useStudio> }) {
  const { settings } = s;
  async function testSound() {
    if (!await s.initialize()) return;
    const start = piano.now;
    [60, 64, 67].forEach((note, index) => piano.play(note, 80, start + index * 0.6, 0.5));
  }
  return (
    <Dialog.Root onOpenChange={open => { if (open) void s.refresh(); }}>
      <Dialog.Trigger className="device-trigger">
        <Cable size={16} /><span>{s.device?.name || '连接 MIDI 键盘'}</span>
        <i className={s.device ? 'device-led connected' : 'device-led'} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-backdrop" />
        <Dialog.Content className="device-dialog">
          <div className="panel-title"><Dialog.Title>设备与声音</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="关闭设备设置"><X size={20} /></Dialog.Close>
          </div>
          <Dialog.Description>连接 USB 键盘后，刷新并选择 MIDI 输入设备。也可以直接使用屏幕琴键。</Dialog.Description>
          <div className="device-select">
            <label>MIDI 输入设备<select value={s.device?.id || ''} onChange={event => void s.connectDevice(event.target.value)}>
              <option value="">未连接</option>
              {s.devices.map(port => <option key={port.id} value={port.id}>{port.name}</option>)}
            </select></label>
            <button className="soft-button" onClick={() => void s.refresh()}><RefreshCw size={15} />刷新</button>
          </div>
          {s.midiError ? <p className="error" role="alert">{s.midiError}</p> :
            !s.devices.length && <p role="status">尚未发现 MIDI 输入设备。</p>}
          <section>
            <h3>声音</h3>
            <label className="slider-field">钢琴音量<span>{Math.round(s.volume * 100)}%</span>
              <input type="range" min="0" max="1" step="0.01" value={s.volume} onChange={e => s.setVolume(Number(e.target.value))} />
            </label>
            <label className="slider-field">节拍器音量<span>{Math.round(settings.clickVolume * 100)}%</span>
              <input type="range" min="0" max="1" step="0.01" value={settings.clickVolume} disabled={s.busy}
                onChange={e => s.setSettings(previous => ({ ...previous, clickVolume: Number(e.target.value) }))} />
            </label>
            <label className="field-row">跟拍时播放伴奏或另一声部<input type="checkbox" checked={settings.accompaniment} disabled={s.busy}
              onChange={e => s.setSettings(previous => ({ ...previous, accompaniment: e.target.checked }))} /></label>
            <div className="panel-actions"><button className="soft-button" onClick={() => void testSound()} disabled={s.loading}>
              <Volume2 size={16} />{s.loading ? '加载音色…' : '播放测试音'}</button>
              <button className="text-button" onClick={() => s.stop()}>停止所有声音</button></div>
          </section>
          <details><summary>输入延迟补偿</summary>
            <p>若跟拍反馈持续滞后，可增加补偿值。补偿值保存在本机，当前用于{s.device?.name ?? '屏幕琴键'}。</p>
            <label className="slider-field">时间补偿<span>{settings.offset} ms</span>
              <input type="range" min="-200" max="200" step="5" value={settings.offset} disabled={s.busy || s.status === 'paused'}
                onChange={e => s.setOffset(Number(e.target.value))} />
            </label>
            <p>音频系统报告的基础与输出延迟合计{s.ready ? `约 ${piano.latency} ms` : '在启用声音后可见'}。</p>
            {s.device && <>
              <button className="soft-button" onClick={s.measureTiming}>记录延迟测量</button>
              <p>弹奏后可记录最近 128 次带时间戳的按键与松键事件。输入传递延迟从 MIDI 事件时刻算到应用收到消息，抖动取 P95 与中位数之差。</p>
              {s.measurement && <p aria-label="设备延迟测量">
                {new Date(s.measurement.date).toLocaleString()} · {s.measurement.count} 个样本<br />
                输入中位数 {s.measurement.medianMs.toFixed(1)} ms · P95 {s.measurement.p95Ms.toFixed(1)} ms · 抖动 {s.measurement.jitterMs.toFixed(1)} ms<br />
                音频系统报告的输出延迟 {s.measurement.outputMs === null ? '未知' : `${s.measurement.outputMs.toFixed(1)} ms`}
              </p>}
            </>}
            {s.timingNotice && <p role="status">{s.timingNotice}</p>}
          </details>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
