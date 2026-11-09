import { expect, test } from '@playwright/test';

test('completing study and a guided round updates the chapter and opens the next chapter', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /学习讲解 · 坐稳/ }).click();
  for (const check of await page.getByRole('checkbox').all()) await check.check();
  await expect(page.getByRole('region', { name: '本课完成进度' })).toContainText('本课完成 1/2');
  await page.getByRole('button', { name: '开始本节练习' }).first().click();
  await page.getByRole('button', { name: '3D 指法' }).click();
  await expect(page.locator('.hand-stage')).toHaveAttribute('aria-busy', 'false');
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
  for (let index = 0; index < 4; index++) await page.getByRole('button', { name: 'C4 琴键', exact: true }).click();
  const progress = page.getByRole('region', { name: '本课完成进度' });
  await expect(progress).toContainText('本课已完成');
  await expect(progress).toContainText('本章已完成 1/1 课');
  await expect(page.getByRole('region', { name: '屏幕琴键' })).toBeInViewport({ ratio: 1 });
  const score = page.locator('.score-stage');
  await expect.poll(() => score.evaluate(element => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
  await progress.getByRole('button', { name: /下一章 · 认识右手/ }).click();
  await expect(page.getByRole('heading', { name: '认识右手的五个手指', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '本课完成进度' })).toContainText('本课完成 0/2');
  await page.getByRole('button', { name: /下一课 · 给左手建立/ }).click();
  await expect(page.getByRole('heading', { name: '给左手建立固定手位', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /下一章 · 让一个音/ }).click();
  await expect(page.getByRole('heading', { name: '让一个音，跟上拍子', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '学习路径', exact: true }).last().click();
  await expect(page.getByRole('progressbar', { name: '01 · 坐姿与触键 完成进度' })).toHaveAttribute('value', '1');
  await expect(page.getByRole('article', { name: '坐稳，放松地弹出第一个音' })).toContainText('待独立完成');
  await page.reload();
  await page.getByRole('button', { name: '学习路径', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: '全部课程完成进度' })).toHaveAttribute('value', '1');
});

test('partial practice keeps the remaining task visible and allows the next lesson', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /学习讲解 · 让一个音/ }).click();
  for (const check of await page.getByRole('checkbox').all()) await check.check();
  await page.getByRole('button', { name: '开始本节练习' }).first().click();
  await page.getByRole('button', { name: '练习片段' }).click();
  await page.getByLabel('结束小节').selectOption('0');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
  for (let index = 0; index < 4; index++) await page.getByRole('button', { name: 'C4 琴键', exact: true }).click();
  await expect(page.getByRole('region', { name: '本课完成进度' })).toContainText('本课完成 1/2');
  await expect(page.getByRole('button', { name: /下一课 · 让旋律/ })).toBeEnabled();
  await page.getByRole('button', { name: '学习路径', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: '03 · 读谱与拍感 完成进度' })).toHaveAttribute('value', '0');
});

test('legacy rounds migrate to durable progress and a later self-check completes the chapter', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('seeded-progress')) return;
    localStorage.setItem('seeded-progress', 'true');
    localStorage.setItem('banpai:learning', JSON.stringify({ 'fingers-right': ['0', '1', '2'], 'fingers-left': ['0', '1'] }));
    localStorage.setItem('banpai:attempts', JSON.stringify(['fingers-right', 'fingers-left'].map(lessonId => ({
      id: lessonId, lessonId, title: lessonId, date: '2026-11-10', total: 8, hit: 8, wrong: 0,
      fullLesson: true, assisted: false, mode: 'wait', hands: 'both', bpm: 50, input: 'MIDI',
      early: 0, late: 0, durationErrors: 0,
    }))));
  });
  await page.goto('/');
  await expect(page.getByRole('progressbar', { name: '02 · 指法与手位 完成进度' })).toHaveAttribute('value', '1');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('banpai:practiceProgress') || '{}')['fingers-left'])).toBe('independent');
  await page.evaluate(() => localStorage.removeItem('banpai:attempts'));
  await page.reload();
  await page.getByRole('button', { name: '学习路径', exact: true }).click();
  await page.getByRole('button', { name: /学习讲解 · 给左手建立/ }).click();
  await page.getByRole('checkbox').last().check();
  await expect(page.getByRole('region', { name: '本课完成进度' })).toContainText('本章已完成 2/2 课');
  await page.getByRole('button', { name: /下一章 · 让一个音/ }).click();
  await expect(page.getByRole('heading', { name: '让一个音，跟上拍子', exact: true })).toBeVisible();
});

test('the last lesson returns to the route without claiming earlier lessons are complete', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /学习讲解 · 把小练习/ }).click();
  const progress = page.getByRole('region', { name: '本课完成进度' });
  await expect(progress).toContainText('已到基础课程末尾');
  await expect(progress).toContainText('本课完成 0/2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await progress.getByRole('button', { name: '查看学习路径' }).click();
  await expect(page.getByRole('progressbar', { name: '全部课程完成进度' })).toHaveAttribute('value', '0');
});
