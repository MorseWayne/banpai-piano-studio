import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('banpai:lastLesson')) localStorage.setItem('banpai:lastLesson', JSON.stringify('pulse'));
  });
});

test('the piano adapts its range and plays a two-note touch chord', async ({ page }) => {
  await page.goto('/');
  const piano = page.getByRole('group', { name: '钢琴键盘' });
  await expect(piano.getByRole('button')).toHaveCount(61);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(piano.getByRole('button')).toHaveCount(25);
  await page.getByRole('button', { name: '学习路径' }).click();
  await page.getByRole('button', { name: /直接练习 · 两只手，一起落下/ }).click();
  const bass = piano.getByRole('button', { name: 'C3 琴键', exact: true });
  const treble = piano.getByRole('button', { name: 'C4 琴键', exact: true });
  await expect(bass).toHaveAttribute('data-hand', 'left');
  await expect(treble).toHaveAttribute('data-hand', 'right');
  await expect(bass).toContainText('5');
  await expect(treble).toContainText('1');
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeVisible();
  await piano.scrollIntoViewIfNeeded();
  const fingers = await Promise.all([bass, treble].map(async (key, id) => {
    const rect = await key.boundingBox();
    if (!rect) throw new Error('Expected a visible key');
    return { id, x: rect.x + rect.width / 2, y: rect.y + rect.height * 0.8 };
  }));
  const touch = await page.context().newCDPSession(page);
  await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [fingers[0]] });
  await expect(bass).toHaveAttribute('data-active', '');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers });
  await expect(piano.locator('[data-active]')).toHaveCount(2);
  await expect(page.getByRole('status')).toContainText('找到了');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(piano.locator('[data-active]')).toHaveCount(0);
  await page.getByLabel('目标音提示').uncheck();
  await expect(piano.locator('[data-hand]')).toHaveCount(0);
});

test('an external MIDI note lights the same black key that arrow keys can play', async ({ page }) => {
  await page.addInitScript(() => {
    const port = {
      id: 'test', name: '测试键盘', state: 'connected',
      open: async () => {}, close: async () => {},
      onmidimessage: null as null | ((event: { data: number[] }) => void),
    };
    Object.defineProperty(navigator, 'requestMIDIAccess', {
      value: async () => ({ inputs: new Map([[port.id, port]]) }),
    });
    window.addEventListener('test-midi', event => port.onmidimessage?.({ data: (event as CustomEvent<number[]>).detail }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: '连接 MIDI 键盘' }).click();
  await page.getByLabel('MIDI 输入设备').selectOption('test');
  await expect(page.getByLabel('MIDI 输入设备')).toHaveValue('test');
  await page.getByRole('button', { name: '关闭设备设置' }).click();
  const black = page.getByRole('button', { name: 'C♯4 琴键', exact: true });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('test-midi', { detail: [0x90, 61, 90] })));
  await expect(black).toHaveAttribute('data-active', '');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('test-midi', { detail: [0x80, 61, 0] })));
  await expect(black).not.toHaveAttribute('data-active', '');
  await page.getByRole('button', { name: 'C4 琴键', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(black).toBeFocused();
  await page.keyboard.down('Space');
  await expect(black).toHaveAttribute('data-active', '');
  await page.keyboard.up('Space');
  await expect(black).not.toHaveAttribute('data-active', '');
});

test('the player fits the desktop minimum and a full wait-mode performance reaches history', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '开始练习' })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('region', { name: '屏幕琴键' })).toBeInViewport({ ratio: 1 });
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeVisible();
  for (let i = 0; i < 8; i++) await page.getByRole('button', { name: 'C4 琴键', exact: true }).click();
  await expect(page.getByRole('region', { name: '本轮结果' })).toContainText('命中 8/8');
  await page.getByRole('button', { name: '查看记录' }).click();
  await expect(page.getByRole('row').last()).toContainText('屏幕琴键');
  await page.reload();
  await page.getByRole('button', { name: '练习记录', exact: true }).click();
  await expect(page.getByRole('row').last()).toContainText('8/8');
});

test('controls support keyboard use and settings stay in sync with the player', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: '找音' }).focus();
  await page.keyboard.down('ArrowRight');
  await expect(page.getByRole('radio', { name: '跟拍' })).toBeFocused();
  await page.keyboard.up('ArrowRight');
  await expect(page.getByRole('radio', { name: '跟拍' })).toBeChecked();
  const tempo = page.getByRole('button', { name: '速度与节拍' });
  await tempo.click();
  await page.getByRole('button', { name: '提高速度' }).click();
  await page.keyboard.press('Escape');
  await expect(tempo).toBeFocused();
  await expect(tempo).toContainText('62');
  await page.getByRole('button', { name: '练习片段' }).click();
  await page.getByLabel('起始小节').selectOption({ label: '2' });
  await page.getByLabel('循环练习此片段').check();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '练习片段' })).toContainText('循环 2–2');
  await page.getByRole('button', { name: '连接 MIDI 键盘' }).click();
  await expect(page.getByRole('dialog', { name: '设备与声音' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '连接 MIDI 键盘' })).toBeFocused();
  await page.getByRole('button', { name: '听示范' }).click();
  await expect(page.getByRole('radio', { name: '跟拍' })).toBeDisabled();
  await page.getByRole('button', { name: '停止', exact: true }).click();
  await expect(page.getByRole('radio', { name: '跟拍' })).toBeEnabled();
});

test('a narrow screen can browse individual bars and import a score into the player', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '下一页乐谱' }).click();
  await expect(page.getByRole('button', { name: '第 2 小节', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '练习片段' })).toContainText('1–2');
  await page.getByRole('button', { name: '本课要点', exact: true }).click();
  await expect(page.getByRole('button', { name: '查看完整讲解' })).toBeVisible();
  await page.getByRole('button', { name: '想弹的歌' }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '导入 MusicXML' }).click();
  await (await chooser).setFiles('public/example.musicxml');
  await expect(page.getByRole('button', { name: '开始练习' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: '想弹的歌' }).click();
  await expect(page.locator('.library-list').first().getByRole('button')).toHaveCount(1);
});
