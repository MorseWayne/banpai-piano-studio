import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('banpai:lastLesson')) localStorage.setItem('banpai:lastLesson', JSON.stringify('pulse'));
  });
});

test('the playable 3D view follows the lesson and switches back to the regular piano', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '学习路径' }).click();
  await page.getByRole('button', { name: /直接练习 · 让旋律走两步/ }).click();
  const toggle = page.getByRole('button', { name: '3D 指法' });
  await toggle.click();
  await expect(page.locator('.hand-stage')).toHaveAttribute('aria-busy', 'false', { timeout: 15000 });
  const readout = page.getByLabel('当前示范指法');
  await expect(readout).toContainText('C4 · 拇指');
  let reloadedModels = 0;
  page.on('request', request => { if (request.url().endsWith('.glb')) reloadedModels++; });
  await page.getByRole('button', { name: '俯视键位' }).click();
  await expect(page.getByRole('button', { name: '俯视键位' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.hand-stage')).toHaveAttribute('aria-busy', 'false');
  const score = await page.locator('.sheet').boundingBox();
  const hand = await page.locator('.hand-view').boundingBox();
  expect(score!.y).toBeGreaterThanOrEqual(0);
  expect(score!.y + score!.height).toBeLessThanOrEqual(hand!.y);
  expect(hand!.y + hand!.height).toBeLessThanOrEqual(720);
  expect(reloadedModels).toBe(0);
  await page.getByRole('button', { name: '演奏视角' }).click();
  const piano = page.getByRole('group', { name: '立体钢琴键盘' });
  const fullWidth = (await piano.boundingBox())!.width;
  const closeup = page.getByRole('button', { name: '拇指特写', exact: true });
  await closeup.click();
  await expect(closeup).toHaveAttribute('aria-pressed', 'true');
  const detail = page.getByLabel('拇指侧面特写');
  await expect(detail.getByRole('button', { name: '右手', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const splitKeys = (await piano.boundingBox())!;
  const detailBounds = (await detail.boundingBox())!;
  expect(splitKeys.width).toBeLessThanOrEqual(fullWidth + 1);
  expect(splitKeys.x + splitKeys.width).toBeLessThanOrEqual(detailBounds.x + 1);
  const stage = (await page.locator('.hand-stage').boundingBox())!;
  const cameraTools = (await page.getByRole('group', { name: '特写镜头调节' }).boundingBox())!;
  expect(detailBounds.y + detailBounds.height).toBeLessThanOrEqual(stage.y);
  expect(cameraTools.y).toBeGreaterThanOrEqual(stage.y + stage.height);
  const angle = page.getByRole('slider', { name: '特写观察高度' });
  await angle.press('Home');
  await expect(angle).toHaveValue('8');
  await angle.press('End');
  await expect(angle).toHaveValue('40');
  await page.getByRole('button', { name: '放大特写', exact: true }).click();
  await expect(page.getByRole('button', { name: '还原特写大小' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '重置特写镜头' }).click();
  await expect(angle).toHaveValue('18');
  await expect(page.getByRole('button', { name: '重置特写镜头' })).toBeDisabled();
  await expect(readout).toContainText('C4 · 拇指');
  await detail.getByRole('button', { name: '左手', exact: true }).click();
  await expect(page.getByText('当前没有左手指法')).toBeVisible();
  await detail.getByRole('button', { name: '右手', exact: true }).click();
  await expect(page.getByText('当前没有左手指法')).toHaveCount(0);
  expect(reloadedModels).toBe(0);
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
  await piano.getByRole('button', { name: 'C♯4 琴键', exact: true }).click();
  await expect(readout).toContainText('C4 · 拇指');
  await piano.getByRole('button', { name: 'C4 琴键', exact: true }).click();
  await expect(readout).toContainText('D4 · 食指');
  await closeup.click();
  await expect(detail).toHaveCount(0);
  expect((await piano.boundingBox())!.width).toBeCloseTo(fullWidth, 0);
  await page.getByLabel('目标音提示').uncheck();
  await expect(readout).toContainText('指法提示已隐藏');
  await expect(piano.locator('[data-hand]')).toHaveCount(0);
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(page.getByRole('group', { name: '钢琴键盘', exact: true })).toBeVisible();
});

test('inspection keeps both staves and camera controls visible at desktop sizes and fits a narrow screen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '学习路径' }).click();
  await page.getByRole('button', { name: '左右手配合强化' }).click();
  await page.getByRole('button', { name: /直接练习 · 一只手保持，一只手前进/ }).click();
  await page.getByRole('button', { name: '3D 指法' }).click();
  await expect(page.locator('.hand-stage')).toHaveAttribute('aria-busy', 'false');
  await page.getByRole('button', { name: '拇指特写', exact: true }).click();
  for (const width of [960, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    const score = page.locator('.score-stage');
    await expect.poll(() => score.evaluate(element => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
    for (const note of await score.locator('[data-score-event]').all()) {
      await expect(note).toBeInViewport({ ratio: .99999 });
    }
    await expect(page.getByRole('region', { name: '屏幕琴键' })).toBeInViewport({ ratio: 1 });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('slider', { name: '特写观察高度' }).scrollIntoViewIfNeeded();
  const panel = (await page.locator('.hand-view').boundingBox())!;
  for (const button of await page.locator('.hand-toolbar button, .hand-camera-tools button').all()) {
    const bounds = (await button.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(panel.x);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(panel.x + panel.width);
  }
});

test('a failed model load restores the playable standard keyboard', async ({ page }) => {
  await page.route('**/hands/ultraleap-right.glb', route => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: '3D 指法' }).click();
  await expect(page.getByRole('alert')).toContainText('已切回普通琴键');
  await expect(page.getByRole('button', { name: 'C4 琴键', exact: true })).toBeEnabled();
});

test('an imported repeated note changes its demonstrated finger through normal practice', async ({ page }) => {
  const notes = [3, 2, 1].map((finger, index) => `<note><pitch><step>C</step><octave>4</octave></pitch>
    <duration>${index === 2 ? 2 : 1}</duration><staff>1</staff>
    <notations><technical><fingering>${finger}</fingering></technical></notations></note>`).join('');
  const xml = `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
    <part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
    <clef><sign>G</sign><line>2</line></clef></attributes>${notes}</measure></part></score-partwise>`;
  await page.goto('/');
  await page.getByRole('button', { name: '想弹的歌' }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: '同音换指.musicxml', mimeType: 'application/xml', buffer: Buffer.from(xml) });
  await page.getByRole('button', { name: '3D 指法' }).click();
  await expect(page.locator('.hand-stage')).toHaveAttribute('aria-busy', 'false');
  const readout = page.getByLabel('当前示范指法');
  await expect(readout).toContainText('C4 · 中指');
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
  const key = page.getByRole('button', { name: 'C4 琴键', exact: true });
  await key.click();
  await expect(readout).toContainText('C4 · 食指');
  await key.click();
  await expect(readout).toContainText('C4 · 拇指');
  await page.getByRole('button', { name: '俯视键位' }).click();
  await expect(readout).toContainText('C4 · 拇指');
});
