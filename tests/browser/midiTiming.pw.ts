import { expect, test, type Page } from '@playwright/test';

interface TimingProbe {
  context?: AudioContext;
  openings: number;
  failNextOpen?: boolean;
  play: (pitch: number, oldSession?: boolean, eventTime?: number) => void;
}
declare global { interface Window { timingProbe: TimingProbe } }

async function installInputs(page: Page) {
  await page.addInitScript(() => {
    type Receiver = (event: { data: number[]; timeStamp: number }) => void;
    let receiver: Receiver | null = null, previous: Receiver | null = null;
    window.timingProbe = {
      openings: 0,
      play(pitch, oldSession = false, eventTime = performance.now()) {
        const deliver = oldSession ? previous : receiver;
        deliver?.({ data: [0x90, pitch, 90], timeStamp: eventTime });
        deliver?.({ data: [0x80, pitch, 0], timeStamp: eventTime });
      },
    };
    const ports = ['A', 'B'].map(id => ({
      id, name: '测试键盘 ' + id, state: 'connected',
      open: async () => {
        if (window.timingProbe.failNextOpen) {
          window.timingProbe.failNextOpen = false;
          throw new Error('测试设备暂未就绪');
        }
        window.timingProbe.openings++;
      }, close: async () => {},
      set onmidimessage(listener: Receiver | null) {
        if (receiver) previous = receiver;
        receiver = listener;
      },
    }));
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map(ports.map(p => [p.id, p])) }) });
    const resume = AudioContext.prototype.resume;
    AudioContext.prototype.resume = function () { window.timingProbe.context = this; return resume.call(this); };
  });
}

test('audio suspension and page freeze preserve the round and reject stale notes after reopening', async ({ page }) => {
  await installInputs(page);
  await page.goto('/');
  await page.getByRole('button', { name: /直接练习 · 让旋律走两步/ }).click();
  await page.getByRole('button', { name: '连接 MIDI 键盘' }).click();
  await page.getByLabel('MIDI 输入设备').selectOption('A');
  await expect(page.getByLabel('MIDI 输入设备')).toHaveValue('A');
  await page.getByRole('button', { name: '关闭设备设置' }).click();
  await page.getByRole('button', { name: '开始练习' }).click();
  const stop = page.getByRole('button', { name: '停止', exact: true });
  const resume = page.getByRole('button', { name: '继续练习', exact: true });
  const key = (name: string) => page.getByRole('button', { name: name + ' 琴键', exact: true });
  await expect(stop).toBeEnabled();
  await page.evaluate(() => window.timingProbe.play(60));
  await expect(key('D4')).toHaveAttribute('data-hand', 'right');
  const before = await page.evaluate(() => performance.now());
  await page.evaluate(() => window.timingProbe.context!.suspend());
  await expect(resume).toBeEnabled();
  await resume.click();
  await expect(stop).toBeEnabled();
  await expect.poll(() => page.evaluate(() => window.timingProbe.openings)).toBe(2);
  await page.evaluate(time => {
    window.timingProbe.play(62, true);
    window.timingProbe.play(62, false, time);
  }, before);
  await expect(key('D4')).toHaveAttribute('data-hand', 'right');
  await page.evaluate(() => window.timingProbe.play(62));
  await expect(key('E4')).toHaveAttribute('data-hand', 'right');
  await page.evaluate(() => document.dispatchEvent(new Event('freeze')));
  await expect(resume).toBeEnabled();
  await page.evaluate(() => {
    window.timingProbe.failNextOpen = true;
    document.dispatchEvent(new Event('resume'));
  });
  // The device may come back later than the WebView. Retrying keeps the partial round.
  await page.getByRole('button', { name: '连接 MIDI 键盘' }).click();
  await page.getByLabel('MIDI 输入设备').selectOption('A');
  await expect(page.getByLabel('MIDI 输入设备')).toHaveValue('A');
  await page.getByRole('button', { name: '关闭设备设置' }).click();
  await resume.click();
  await expect(stop).toBeEnabled();
  await expect.poll(() => page.evaluate(() => window.timingProbe.openings)).toBe(3);
  await page.evaluate(() => { for (const pitch of [64,62,60,62,64]) window.timingProbe.play(pitch); });
  await expect(page.getByRole('region', { name: '本轮结果' })).toContainText('命中 7/7');
  await expect(page.getByRole('region', { name: '本轮结果' })).toContainText('错音 0');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('banpai:attempts')!).length)).toBe(1);
});

test('offsets and recorded delivery measurements belong to the selected input across restarts', async ({ page }) => {
  await installInputs(page);
  await page.goto('/');
  await page.getByRole('button', { name: '连接 MIDI 键盘' }).click();
  await page.getByText('输入延迟补偿', { exact: true }).click();
  const offset = page.getByRole('slider', { name: /时间补偿/ });
  await offset.fill('15');
  const port = page.getByLabel('MIDI 输入设备');
  await port.selectOption('A'); await expect(port).toHaveValue('A');
  await expect(offset).toHaveValue('0');
  await offset.fill('45');
  await page.evaluate(() => window.timingProbe.play(60));
  await page.getByRole('button', { name: '记录延迟测量' }).click();
  await expect(page.getByLabel('设备延迟测量')).toContainText('2 个样本');
  await port.selectOption('B'); await expect(port).toHaveValue('B');
  await expect(offset).toHaveValue('0');
  await expect(page.getByLabel('设备延迟测量')).toHaveCount(0);
  await offset.fill('-20');
  await port.selectOption('');
  await expect(offset).toHaveValue('15');
  await page.reload();
  await page.getByRole('button', { name: '连接 MIDI 键盘' }).click();
  await page.getByText('输入延迟补偿', { exact: true }).click();
  await port.selectOption('A'); await expect(port).toHaveValue('A');
  await expect(offset).toHaveValue('45');
  await expect(page.getByLabel('设备延迟测量')).toContainText('2 个样本');
  await port.selectOption('B'); await expect(port).toHaveValue('B');
  await expect(offset).toHaveValue('-20');
});

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
