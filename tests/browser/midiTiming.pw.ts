import { expect, test } from '@playwright/test';

test('a delayed batch of Web MIDI messages is scored against the audible count-in', async ({ page }) => {
  await page.addInitScript(() => {
    const port = {
      id: 'clock', name: '计时测试键盘', state: 'connected',
      open: async () => {}, close: async () => {},
      onmidimessage: null as null | ((e: { data: number[]; timeStamp: number }) => void),
    };
    Object.defineProperty(navigator, 'requestMIDIAccess', {
      value: async () => ({ inputs: new Map([[port.id, port]]) }),
    });
    // Capture the first actual metronome click scheduled by the practice room.
    // At 120 BPM its four-beat count-in lasts 2 s. Deliver both correctly timed
    // notes in a single batch, after the player has moved on to the third note.
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (when = 0) {
      start.call(this, when);
      OscillatorNode.prototype.start = start;
      const firstMs = performance.now() + (when + 2 - this.context.currentTime) * 1000;
      setTimeout(() => {
        port.onmidimessage?.({ data: [0x90, 60, 90], timeStamp: firstMs });
        port.onmidimessage?.({ data: [0x80, 60, 0], timeStamp: firstMs + 500 });
        port.onmidimessage?.({ data: [0x90, 62, 90], timeStamp: firstMs + 500 });
        port.onmidimessage?.({ data: [0x80, 62, 0], timeStamp: firstMs + 1000 });
      }, firstMs + 1150 - performance.now());
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: /直接练习 · 让旋律走两步/ }).click();
  await page.getByRole('button', { name: '连接 MIDI 键盘' }).click();
  await page.getByLabel('MIDI 输入设备').selectOption('clock');
  await expect(page.getByLabel('MIDI 输入设备')).toHaveValue('clock');
  await page.getByRole('button', { name: '关闭设备设置' }).click();
  await page.getByRole('radio', { name: '跟拍' }).click();
  await page.getByRole('button', { name: '速度与节拍' }).click();
  await page.getByRole('slider', { name: '练习速度' }).fill('120');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '开始练习' }).click();
  const result = page.getByRole('region', { name: '本轮结果' });
  await expect(result).toContainText('命中 2/7', { timeout: 12000 });
  await expect(result).toContainText('错音 0');
  await expect(result).toContainText('提前 0 · 滞后 0');
  await expect(result).toContainText('时值偏差 0');
});
