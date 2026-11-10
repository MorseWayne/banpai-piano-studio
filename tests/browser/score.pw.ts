import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('banpai:lastLesson')) localStorage.setItem('banpai:lastLesson', JSON.stringify('pulse'));
  });
});

test('the playhead traverses a held note and waits on the next notehead', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '学习路径' }).click();
  await page.getByRole('button', { name: /直接练习 · 用两个音打招呼/ }).click();
  const sheet = page.getByRole('region', { name: '练习乐谱' });
  const toggle = sheet.getByRole('button', { name: '节拍线' });
  const footer = sheet.locator('.sheet-footer');
  const barSelector = footer.getByRole('group', { name: '选择起练小节' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await sheet.getByRole('button', { name: /试听第 1 小节 · 第 1 拍/ }).click();
  await expect(footer).toHaveText(await barSelector.textContent() ?? '');
  expect(await barSelector.evaluate(el => Math.abs(el.getBoundingClientRect().right - el.parentElement!.getBoundingClientRect().right))).toBeLessThan(1);
  await page.getByRole('button', { name: '开始练习' }).click();
  const line = sheet.locator('.score-playhead');
  await expect(line).toHaveAttribute('data-state', 'ready');
  await expect(line).toBeVisible();
  const firstX = (await line.boundingBox())!.x;
  const head = sheet.getByRole('button', { name: /试听第 1 小节 · 第 3 拍/ }).locator('.vf-notehead').first();
  const target = (await head.boundingBox())!;
  const targetX = target.x + target.width / 2;
  await page.getByRole('button', { name: 'C4 琴键', exact: true }).click();
  await page.waitForFunction(([left, right]) => {
    const x = document.querySelector('.score-playhead')!.getBoundingClientRect().x;
    return x > left + 4 && x < right - 4;
  }, [firstX, targetX]);
  await expect(line).toHaveAttribute('data-state', 'ready');
  await expect(footer).toHaveText(await barSelector.textContent() ?? '');
  const arrived = (await line.boundingBox())!;
  expect(Math.abs(arrived.x + arrived.width / 2 - targetX)).toBeLessThan(1.5);
  await page.getByRole('button', { name: 'E4 琴键', exact: true }).click();
  expect((await line.boundingBox())!.x).toBe(arrived.x);
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
  await toggle.click();
  await expect(line).toHaveCount(0);
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('rhythm guide counts in, crosses a rest, and freezes while paused', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '学习路径' }).click();
  await page.getByRole('button', { name: /直接练习 · 给旋律留一拍空白/ }).click();
  await page.getByRole('button', { name: '练习片段' }).click();
  await page.getByLabel('起始小节').selectOption('1');
  await page.keyboard.press('Escape');
  await page.getByRole('radio', { name: '跟拍' }).click();
  await page.getByRole('button', { name: '速度与节拍' }).click();
  await page.getByRole('slider', { name: '练习速度' }).fill('100');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '开始练习' }).click();
  const line = page.locator('.score-playhead');
  await expect(line).toHaveAttribute('data-state', 'counting');
  const afterRest = page.getByRole('button', { name: /试听第 2 小节 · 第 3 拍/ }).locator('.vf-notehead').first();
  const target = (await afterRest.boundingBox())!;
  await page.waitForFunction(x => document.querySelector('.score-playhead')!.getBoundingClientRect().x >= x, target.x);
  await page.getByRole('button', { name: '本课要点', exact: true }).click();
  await expect(line).toHaveAttribute('data-state', 'paused');
  await page.getByRole('button', { name: '继续练习' }).click();
  await expect(line).toHaveAttribute('data-state', 'counting');
});

test('auditioning a note shows its key; playing moves the cursor without replacing the score', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '学习路径' }).click();
  await page.getByRole('button', { name: /直接练习 · 让旋律走两步/ }).click();
  const sheet = page.getByRole('region', { name: '练习乐谱' });
  const e = sheet.getByRole('button', { name: /试听第 1 小节 · 第 3 拍 · 右手 E4/ });
  await e.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'E4 琴键', exact: true })).toHaveAttribute('data-hand', 'right');
  await expect(page.getByRole('button', { name: '开始练习' })).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem('banpai:attempts'))).toBeNull();

  const svg = sheet.locator('.score-stage svg').first();
  await svg.evaluate(element => element.setAttribute('data-before-playing', 'yes'));
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(e).toHaveAttribute('aria-disabled', 'true');
  const cursor = sheet.locator('.score-playhead');
  await expect(cursor).toBeVisible();
  const before = await cursor.boundingBox();
  await page.getByRole('button', { name: 'C4 琴键', exact: true }).click();
  await expect.poll(async () => (await cursor.boundingBox())?.x).toBeGreaterThan(before!.x);
  await expect(svg).toHaveAttribute('data-before-playing', 'yes');
  await page.getByLabel('目标音提示').uncheck();
  await expect(cursor).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(sheet.getByRole('button', { name: '第 1 小节', exact: true })).toBeVisible();
  await page.getByLabel('目标音提示').check();
  for (const name of ['D4', 'E4', 'D4']) {
    await page.getByRole('button', { name: name + ' 琴键', exact: true }).click();
  }
  await expect(sheet.getByRole('button', { name: '第 1 小节', exact: true })).toBeVisible();
  await expect(sheet.getByRole('button', { name: '第 2 小节', exact: true })).toBeVisible();
  await expect(sheet.getByRole('button', { name: /试听第 2 小节 · 第 1 拍/ })).toHaveAttribute('aria-disabled', 'true');
  await expect(cursor).toBeVisible();
});

test('imported grand staff keeps flats, dotted chords and bar positions after reload and zoom', async ({ page }) => {
  const xml = `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
    <part id="P1"><measure number="1"><attributes><divisions>2</divisions><time><beats>3</beats><beat-type>4</beat-type></time>
    <staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>
    <note><rest/><duration>6</duration><staff>1</staff></note></measure>
    <measure number="2"><note><pitch><step>D</step><alter>-1</alter><octave>4</octave></pitch><duration>3</duration><staff>1</staff></note>
    <note><chord/><pitch><step>F</step><octave>4</octave></pitch><duration>3</duration><staff>1</staff></note>
    <note><rest/><duration>3</duration><staff>1</staff></note><backup><duration>6</duration></backup>
    <note><pitch><step>A</step><octave>2</octave></pitch><duration>6</duration><staff>2</staff></note></measure></part></score-partwise>`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '想弹的歌' }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: '三拍子.musicxml', mimeType: 'application/xml', buffer: Buffer.from(xml) });
  await expect(page.getByRole('heading', { name: '三拍子', exact: true })).toBeVisible();
  await page.reload();
  const sheet = page.getByRole('region', { name: '练习乐谱' });
  await sheet.getByRole('button', { name: '下一页乐谱' }).click();
  await sheet.getByLabel('谱面大小').selectOption('1.25');
  const chord = sheet.getByRole('button', { name: /试听第 2 小节 · 第 1 拍 · 右手 D♭4、F4/ });
  await chord.click();
  await expect(page.getByRole('button', { name: 'C♯4 琴键', exact: true })).toHaveAttribute('data-hand', 'right');
  await expect(page.getByRole('button', { name: 'F4 琴键', exact: true })).toHaveAttribute('data-hand', 'right');
  await expect(sheet.getByRole('button', { name: /试听第 2 小节 · 第 1 拍 · 左手 A2/ })).toBeVisible();
  await sheet.getByRole('button', { name: '第 2 小节', exact: true }).click();
  await expect(page.getByRole('button', { name: '练习片段' })).toContainText('2–2');
  await expect(sheet.locator('.score-playhead')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
