import { expect, test } from '@playwright/test';

test('chapter history remembers a specific exercise before a round has been completed', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: '练习章节' });
  const history = page.getByRole('dialog', { name: '历史章节' });
  await nav.getByRole('button', { name: '历史章节' }).click();
  await expect(history).toContainText('还没有打开过其他练习');
  await history.getByRole('button', { name: '浏览全部章节' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '用两个音打招呼' }).click();
  await nav.getByRole('button', { name: '下一章' }).click();
  await page.reload();
  await nav.getByRole('button', { name: '历史章节' }).click();
  await expect(history.getByRole('listitem')).toHaveCount(1);
  await history.getByRole('button', { name: /01 · 坐姿与触键.*用两个音打招呼/ }).click();
  await expect(page.getByRole('heading', { name: '用两个音打招呼' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('banpai:attempts'))).toBeNull();
});

test('the round result reopens an earlier chapter from legacy practice records', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('banpai:attempts', JSON.stringify([{
      id: 'prior', lessonId: 'right', title: '让旋律走两步', date: '2026-11-10', total: 7, hit: 7,
      mode: 'wait', hands: 'right', wrong: 0, assisted: true, fullLesson: true,
    }]));
  });
  await page.goto('/');
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'C4 琴键', exact: true }).click();
  const review = page.getByRole('region', { name: '本课完成进度' }).getByRole('button', { name: '历史章节' });
  await review.click();
  await page.keyboard.press('Escape');
  await expect(review).toBeFocused();
  await review.click();
  await page.getByRole('dialog', { name: '历史章节' }).getByRole('button', { name: /03 · 读谱与拍感.*让旋律走两步/ }).click();
  await expect(page.getByRole('heading', { name: '让旋律走两步' })).toBeVisible();
});

test('the directory browses earlier chapters without losing a paused round', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('banpai:lastLesson')) localStorage.setItem('banpai:lastLesson', JSON.stringify('two-keys'));
  });
  await page.goto('/');
  const picker = page.getByRole('button', { name: /^章节目录，当前为/ });
  const previous = page.getByRole('button', { name: '上一章', exact: true });
  const dialog = page.getByRole('dialog', { name: '章节目录' });
  await expect(previous).toHaveCount(0);
  await page.getByRole('button', { name: '下一章', exact: true }).click();
  await previous.click();
  await expect(page.getByRole('heading', { name: '用两个音打招呼' })).toBeVisible();
  await page.getByRole('button', { name: '下一章', exact: true }).click();
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
  await picker.click();
  await expect(dialog.getByRole('button', { name: /换个结尾，再答一句/ })).toHaveAttribute('aria-current', 'page');
  await dialog.getByRole('button', { name: '01 · 坐姿与触键' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '继续练习' })).toBeEnabled();
  await picker.click();
  await dialog.getByRole('button', { name: '01 · 坐姿与触键' }).click();
  await dialog.getByRole('button', { name: '用两个音打招呼' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '用两个音打招呼' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('banpai:attempts'))).toBeNull();
  await page.setViewportSize({ width: 390, height: 844 });
  await picker.click();
  await dialog.getByRole('combobox', { name: '章节' }).selectOption('14 · 排练与完整演奏');
  await dialog.getByRole('button', { name: /从前奏到尾声/ }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: /从前奏到尾声/ })).toBeVisible();
  await expect(previous).toBeVisible();
  await expect(page.getByRole('button', { name: '下一章', exact: true })).toHaveCount(0);
});

test('the practice header jumps chapters before or during practice without awarding completion', async ({ page }) => {
  await page.goto('/');
  const nextChapter = page.getByRole('button', { name: '下一章', exact: true });
  await nextChapter.click();
  await expect(page.getByRole('heading', { name: '换个结尾，再答一句' })).toBeVisible();
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'C4 琴键', exact: true }).click();
  await nextChapter.click();
  await expect(page.getByRole('heading', { name: '让一个音，跟上拍子' })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始练习' })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole('heading', { name: '让一个音，跟上拍子' })).toBeVisible();
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '学习路径' }).click();
  await expect(page.getByRole('progressbar', { name: '全部课程完成进度' })).toHaveAttribute('value', '0');
});

test('practice alone advances the chapter and opens the next playable score', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '3D 指法' }).click();
  await expect(page.locator('.hand-stage')).toHaveAttribute('aria-busy', 'false');
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
  for (let index = 0; index < 4; index++) await page.getByRole('button', { name: 'C4 琴键', exact: true }).click();
  const progress = page.getByRole('region', { name: '本课完成进度' });
  await expect(progress).toContainText('本课练习已完成');
  await expect(progress).toContainText('本章已完成 1/5 课');
  await expect(page.getByRole('region', { name: '屏幕琴键' })).toBeInViewport({ ratio: 1 });
  const score = page.locator('.score-stage');
  await expect.poll(() => score.evaluate(element => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: '本课要点', exact: true }).click();
  await page.getByRole('button', { name: '查看完整讲解' }).click();
  await page.getByRole('button', { name: '返回练习室', exact: true }).click();
  await progress.getByRole('button', { name: /下一练习 · 用两个音/ }).click();
  await expect(page.getByRole('heading', { name: '用两个音打招呼', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '练习乐谱' })).toBeVisible();
  await page.getByRole('button', { name: '本课要点', exact: true }).click();
  await page.getByRole('button', { name: '查看完整讲解' }).click();
  await expect(page.getByRole('region', { name: '本课完成进度' })).toContainText('待完成整课练习');
  const ear = page.getByRole('region', { name: '听辨练习' });
  await ear.getByRole('button', { name: '听谱例' }).click();
  await ear.getByRole('button', { name: '往高处走' }).click();
  await expect(ear.getByRole('status')).toContainText('再听一遍');
  await ear.getByRole('button', { name: '听谱例' }).click();
  await ear.getByRole('button', { name: '回到低音' }).click();
  await expect(ear.getByRole('status')).toContainText('听对了');
  await ear.getByRole('button', { name: '停止试听' }).click();
  await page.getByRole('button', { name: /下一练习 · 三指回声/ }).click();
  await expect(page.getByRole('heading', { name: '三指回声', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '学习路径', exact: true }).last().click();
  await expect(page.getByRole('progressbar', { name: '01 · 坐姿与触键 完成进度' })).toHaveAttribute('value', '1');
  await expect(page.getByRole('article', { name: '坐稳，放松地弹出第一个音' })).toContainText('待独立完成');
  await page.reload();
  await page.getByRole('button', { name: '学习路径', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: '全部课程完成进度' })).toHaveAttribute('value', '1');
});

test('partial practice keeps the remaining task visible and allows the next lesson', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '学习路径' }).click();
  await page.getByRole('button', { name: /学习讲解 · 让一个音/ }).click();
  for (const check of await page.getByRole('checkbox').all()) await check.check();
  await page.getByRole('button', { name: '开始本节练习' }).first().click();
  await page.getByRole('button', { name: '练习片段' }).click();
  await page.getByLabel('结束小节').selectOption('0');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
  for (let index = 0; index < 4; index++) await page.getByRole('button', { name: 'C4 琴键', exact: true }).click();
  await expect(page.getByRole('region', { name: '本课完成进度' })).toContainText('选段或分手练习结束');
  await expect(page.getByRole('button', { name: /下一练习 · 让旋律/ })).toBeEnabled();
  await page.getByRole('button', { name: '学习路径', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: '03 · 读谱与拍感 完成进度' })).toHaveAttribute('value', '0');
});

test('legacy rounds migrate to durable progress alongside the new chapter exercises', async ({ page }) => {
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
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '学习路径' }).click();
  await expect(page.getByRole('progressbar', { name: '02 · 指法与手位 完成进度' })).toHaveAttribute('value', '2');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('banpai:practiceProgress') || '{}')['fingers-left'])).toBe('independent');
  await page.evaluate(() => localStorage.removeItem('banpai:attempts'));
  await page.reload();
  await page.getByRole('button', { name: '学习路径', exact: true }).click();
  await page.getByRole('button', { name: /学习讲解 · 给左手建立/ }).click();
  await page.getByRole('checkbox').last().check();
  await expect(page.getByRole('region', { name: '本课完成进度' })).toContainText('本章已完成 2/5 课');
  await page.getByRole('button', { name: /进入下一章 · 让一个音/ }).click();
  await expect(page.getByRole('heading', { name: '让一个音，跟上拍子', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '练习乐谱' })).toBeVisible();
});

test('the last lesson returns to the route without claiming earlier lessons are complete', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '学习路径' }).click();
  await page.getByRole('button', { name: '独立编配与演出' }).click();
  await page.getByRole('button', { name: /学习讲解 · 从前奏到尾声/ }).click();
  const progress = page.getByRole('region', { name: '本课完成进度' });
  await expect(progress).toContainText('已到学习路径末尾');
  await expect(progress).toContainText('待完成整课练习');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await progress.getByRole('button', { name: '查看学习路径' }).click();
  await expect(page.getByRole('button', { name: '独立编配与演出' })).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('progressbar', { name: '全部课程完成进度' })).toHaveAttribute('value', '0');
  await page.getByRole('button', { name: /直接练习 · 从前奏到尾声/ }).click();
  await expect(page.getByRole('button', { name: '下一章', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '练习片段' }).click();
  await expect(page.getByLabel('结束小节')).toHaveValue('11');
  await page.getByLabel('起始小节').selectOption({ label: '12' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /试听第 12 小节 · 第 1 拍 · 右手 C4/ })).toBeVisible();
});

test('a first piece completed on a previous day offers its playable new ending', async ({ page }) => {
  await page.addInitScript(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    localStorage.setItem('banpai:lastLesson', JSON.stringify('echo-song'));
    localStorage.setItem('banpai:attempts', JSON.stringify([{
      id: 'first-piece', title: '窗边的回声', lessonId: 'echo-song', date: yesterday.toISOString(),
      total: 11, hit: 11, wrong: 0, fullLesson: true, assisted: true,
    }]));
  });
  await page.goto('/');
  await page.getByRole('button', { name: /隔天复习《窗边的回声》/ }).click();
  await expect(page.getByRole('heading', { name: '换个结尾，再答一句' })).toBeVisible();
  await expect(page.getByRole('region', { name: '练习乐谱' })).toBeVisible();
  await expect(page.getByRole('button', { name: /试听第 2 小节 · 第 3 拍 · 右手 E4/ })).toBeVisible();
});

test('a finished exercise can jump to the next phase and resume there on restart', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
  for (let index = 0; index < 4; index++) await page.getByRole('button', { name: 'C4 琴键', exact: true }).click();
  await page.getByRole('button', { name: '跳到下一阶段 · 读谱与键盘熟练度' }).click();
  await expect(page.getByRole('heading', { name: '用距离读旋律' })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始练习', exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole('heading', { name: '用距离读旋律' })).toBeVisible();
  await expect(page.getByRole('region', { name: '练习乐谱' })).toBeVisible();
});

test('finishing the phase piece goes straight to the first practice in the following phase', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('banpai:lastLesson', JSON.stringify('echo-duet')));
  await page.goto('/');
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
  const touch = await page.context().newCDPSession(page);
  await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  const phrase = [
    ['C3','C4'], ['D4'], ['E4'], ['C3','E4'], ['D4'], ['C4'],
    ['D3','C4'], ['D4'], ['E4'], ['C3','D4'], ['C4'],
  ];
  for (const group of phrase) {
    const points = await Promise.all(group.map(async (pitch, id) => {
      const box = await page.getByRole('button', { name: pitch + ' 琴键', exact: true }).boundingBox();
      if (!box) throw new Error('Missing key ' + pitch);
      return { id, x: box.x + box.width / 2, y: box.y + box.height * .85 };
    }));
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  const progress = page.getByRole('region', { name: '本课完成进度' });
  await expect(progress).toContainText('本课练习已完成');
  await expect(progress.getByRole('button', { name: /跳到下一阶段/ })).toHaveCount(0);
  await progress.getByRole('button', { name: /进入下一阶段 · 用距离读旋律/ }).click();
  await expect(page.getByRole('heading', { name: '用距离读旋律' })).toBeVisible();
  await expect(page.getByRole('region', { name: '练习乐谱' })).toBeVisible();
});
