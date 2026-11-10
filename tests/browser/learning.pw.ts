import { expect, test } from '@playwright/test';

test('the foundation phrase leads into interval reading and its playable score', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '学习路径', exact: true }).click();
  await page.getByRole('button', { name: /学习讲解 · 自己合奏/ }).click();
  await page.getByRole('button', { name: /进入下一阶段 · 用距离读旋律/ }).click();
  await expect(page.getByRole('region', { name: '练习乐谱' })).toBeVisible();
  await page.getByRole('button', { name: '本课要点', exact: true }).click();
  await page.getByRole('button', { name: '查看完整讲解' }).click();
  await page.getByRole('button', { name: '离谱应用' }).click();
  await expect(page.getByRole('article', { name: '课程讲解' })).toContainText('从 G4 起');
  await page.getByRole('button', { name: '开始本节练习' }).first().click();
  await expect(page.getByRole('button', { name: /试听第 1 小节 · 第 1 拍/ }).first()).toBeVisible();
  await page.getByRole('button', { name: '学习路径', exact: true }).click();
  await expect(page.getByRole('button', { name: '读谱与键盘熟练度' })).toHaveAttribute('aria-current', 'step');
});

test('the first visit starts with posture and learning progress persists separately from practice', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '坐稳，放松地弹出第一个音', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '练习乐谱' })).toBeVisible();
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '学习路径' }).click();
  await expect(page.getByRole('heading', { name: '学习路径', exact: true })).toBeVisible();
  await expect(page.getByRole('article').first()).toHaveAttribute('aria-label', '坐稳，放松地弹出第一个音');
  await expect(page.getByRole('article')).toHaveCount(23);
  await page.getByRole('button', { name: /学习讲解 · 坐稳/ }).click();
  await expect(page.getByRole('article', { name: '课程讲解' })).toBeVisible();
  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByRole('heading', { name: '让肩臂和手腕自然连接' })).toBeVisible();
  for (const check of await page.getByRole('complementary', { name: '学习自检' }).getByRole('checkbox').all()) await check.check();
  await expect(page.getByRole('heading', { name: '本课已学习' })).toBeVisible();
  await page.getByRole('button', { name: '学习路径', exact: true }).last().click();
  const posture = page.getByRole('article', { name: '坐稳，放松地弹出第一个音' });
  await expect(posture).toContainText('已学习');
  await expect(posture).toContainText('待练习');
  await expect(posture).toContainText('待独立完成');
  await page.reload();
  await page.getByRole('button', { name: '学习路径', exact: true }).click();
  await page.getByRole('button', { name: /学习讲解 · 坐稳/ }).click();
  await expect(page.getByRole('heading', { name: '本课已学习' })).toBeVisible();
  await page.getByRole('button', { name: '开始本节练习' }).first().click();
  await expect(page.getByRole('region', { name: '练习乐谱' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'C4 琴键', exact: true })).toContainText('3');
});

test('returning from a lesson preserves notes, cursor and the in-progress round', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '学习路径' }).click();
  await page.getByRole('button', { name: /直接练习 · 让旋律走两步/ }).click();
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
  const d = page.getByRole('button', { name: 'D4 琴键', exact: true });
  await page.getByRole('button', { name: 'C4 琴键', exact: true }).click();
  await expect(d).toHaveAttribute('data-hand', 'right');
  await page.getByRole('button', { name: '本课要点', exact: true }).click();
  await expect(page.getByRole('button', { name: '继续练习' })).toBeEnabled();
  await expect(page.getByRole('radio', { name: '跟拍' })).toBeDisabled();
  await expect(page.getByRole('button', { name: /试听第 1 小节 · 第 2 拍/ })).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('button', { name: '查看完整讲解' }).click();
  await expect(page.getByRole('article', { name: '课程讲解' })).toBeVisible();
  await page.getByRole('button', { name: '返回当前练习' }).first().click();
  await expect(d).toHaveAttribute('data-hand', 'right');
  await expect(page.getByRole('region', { name: '屏幕琴键' })).toBeInViewport({ ratio: 1 });
  await page.getByRole('button', { name: '继续练习' }).click();
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
  for (const pitch of ['D4', 'E4', 'D4', 'C4', 'D4', 'E4']) {
    await page.getByRole('button', { name: `${pitch} 琴键`, exact: true }).click();
  }
  await expect(page.getByRole('region', { name: '本轮结果' })).toContainText('命中 7/7');
  await page.getByRole('button', { name: '学习路径', exact: true }).click();
  const course = page.getByRole('article', { name: '让旋律走两步' });
  await expect(course).toContainText('已练习');
  await expect(course).toContainText('待学习');
  await expect(course).toContainText('待独立完成');
});

test('rhythm mode resumes at the paused cursor after a fresh count-in', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '学习路径' }).click();
  await page.getByRole('button', { name: /直接练习 · 让一个音/ }).click();
  await page.getByRole('radio', { name: '跟拍' }).click();
  await page.getByRole('button', { name: '速度与节拍' }).click();
  await page.getByRole('slider', { name: '练习速度' }).fill('160');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '开始练习' }).click();
  // Opening or closing the notes panel makes OSMD re-layout and briefly hide the cursor.
  const cursorX = () => page.locator('.score-stage').evaluate(stage => {
    const box = stage.querySelector('.score-playhead')?.getBoundingClientRect();
    return box?.width ? box.x : 0;
  });
  const visibleX = async () => {
    let x = 0;
    await expect.poll(async () => x = await cursorX()).toBeGreaterThan(0);
    return x;
  };
  await expect(page.locator('.score-playhead')).toHaveAttribute('data-state', 'playing');
  const start = await visibleX();
  await expect.poll(cursorX).toBeGreaterThan(start + 8);
  await page.getByRole('button', { name: '本课要点', exact: true }).click();
  await page.getByRole('button', { name: '收起本课要点' }).click();
  await expect(page.getByRole('button', { name: '继续练习' })).toBeEnabled();
  const paused = await visibleX();
  await page.getByRole('button', { name: '继续练习' }).click();
  await expect(page.getByRole('status')).toContainText('听完预备拍');
  await page.waitForTimeout(700);
  expect(await cursorX()).toBeCloseTo(paused, 0);
  await expect.poll(cursorX).toBeGreaterThan(paused + 5);
  await page.getByRole('button', { name: '停止', exact: true }).click();
});

test('learning content and its linked score remain usable on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '学习路径' }).click();
  await page.getByRole('button', { name: /学习讲解 · 认识右手/ }).click();
  await expect(page.locator('.hand-stage')).toHaveAttribute('aria-busy', 'false');
  const note = page.getByRole('button', { name: /试听第 1 小节 · 第 2 拍 · 右手 D4/ });
  await note.click();
  await expect(page.getByLabel('当前示范指法')).toContainText('D4 · 食指');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const button of await page.locator('.study-steps button').all()) {
    const bounds = (await button.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  }
  await page.getByRole('button', { name: '开始本节练习' }).last().click();
  await expect(page.getByRole('heading', { name: '认识右手的五个手指' })).toBeVisible();
});

test('the paused round keeps the grand staff and 3D hands visible beside lesson reminders', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '学习路径' }).click();
  await page.getByRole('button', { name: /直接练习 · 左手保持，右手走两步/ }).click();
  await page.getByRole('button', { name: '3D 指法' }).click();
  await expect(page.locator('.hand-stage')).toHaveAttribute('aria-busy', 'false');
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '本课要点', exact: true }).click();
  await expect(page.getByRole('button', { name: '继续练习' })).toBeEnabled();
  await page.getByRole('button', { name: '拇指特写', exact: true }).click();
  await expect(page.getByRole('region', { name: '屏幕琴键' })).toBeInViewport({ ratio: 1 });
  const score = page.locator('.score-stage');
  await expect.poll(() => score.evaluate(element => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
  for (const note of await score.locator('[data-score-event]').all()) await expect(note).toBeInViewport({ ratio: .99999 });
});
