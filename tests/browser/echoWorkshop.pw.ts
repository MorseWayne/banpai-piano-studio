import { expect, test, type Page } from '@playwright/test';

async function openWorkshop(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '窗边的回声 · 小曲研习' }).click();
}

test('an error locates the beat, and a complete clean phrase advances the right hand', async ({ page }) => {
  await openWorkshop(page);
  await page.getByRole('button', { name: /右手旋律/ }).click();
  const play = page.getByRole('button', { name: '开始练习' });
  await play.click();
  await expect(page.locator('.echo-live')).toContainText('按谱弹奏');
  await page.keyboard.press('KeyD');
  await expect(page.locator('.echo-live')).toContainText('第 1 小节第 1 拍弹到了 E4。请找右手 C4');
  await expect(page.getByRole('group', { name: '钢琴键盘' })).toBeInViewport({ ratio: 1 });
  for (const key of ['A','S','D','D','S','A']) await page.keyboard.press('Key' + key);
  await expect(page.locator('.echo-report')).toContainText('错音 1 次');
  await play.click();
  await expect(page.locator('.echo-live')).toContainText('按谱弹奏');
  for (const key of ['A','S','D','D','S','A']) await page.keyboard.press('Key' + key);
  await expect(page.getByRole('button', { name: '下一步 · 左手低音' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '窗边的回声 · 小曲研习' }).click();
  await expect(page.locator('.echo-meter')).toContainText('1 / 5');
});

test('independent reading requires two different unseen scores and excludes retries', async ({ page }) => {
  await openWorkshop(page);
  await page.getByRole('button', { name: /陌生谱检验/ }).click();
  const draw = page.getByRole('button', { name: '打开一条新谱' });
  async function playWrittenPhrase() {
    await expect(page.locator('.echo-live')).toContainText('按谱弹奏');
    const events = page.locator('[data-score-event]');
    await expect(events).toHaveCount(6);
    const pitches = await events.evaluateAll(notes => notes.map(note => {
      const [,bar,beat,pitch] = note.getAttribute('aria-label')!.match(/第 (\d+) 小节 · 第 (\d+) 拍 · 右手 ([CDE]4)/)!;
      return { at: Number(bar) * 4 + Number(beat), pitch };
    }).sort((a, b) => a.at - b.at).map(n => n.pitch));
    for (const pitch of pitches) await page.getByRole('button', { name: pitch + ' 琴键', exact: true }).click();
  }
  await draw.click();
  await playWrittenPhrase();
  await expect(page.locator('.echo-evidence')).toContainText('1 / 2');
  await page.getByRole('button', { name: '复练这条谱' }).click();
  await playWrittenPhrase();
  await expect(page.locator('.echo-report')).toContainText('复练');
  await expect(page.locator('.echo-evidence')).toContainText('1 / 2');
  await draw.click();
  await playWrittenPhrase();
  await expect(page.locator('.echo-evidence')).toContainText('2 / 2');
  await expect(page.getByText('已独立读出两条不同的新旋律。')).toBeVisible();
});
