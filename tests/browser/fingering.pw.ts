import { expect, test } from '@playwright/test';

test('the playable 3D view follows the lesson and switches back to the regular piano', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '学习路径' }).click();
  await page.getByRole('button', { name: /让旋律走两步/ }).click();
  const toggle = page.getByRole('button', { name: '3D 指法' });
  await toggle.click();
  await expect(page.locator('.hand-stage')).toHaveAttribute('aria-busy', 'false', { timeout: 15000 });
  const readout = page.getByLabel('当前示范指法');
  await expect(readout).toContainText('C4 · 拇指');
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
  const piano = page.getByRole('group', { name: '立体钢琴键盘' });
  await piano.getByRole('button', { name: 'C♯4 琴键', exact: true }).click();
  await expect(readout).toContainText('C4 · 拇指');
  await piano.getByRole('button', { name: 'C4 琴键', exact: true }).click();
  await expect(readout).toContainText('D4 · 食指');
  await page.getByLabel('目标音提示').uncheck();
  await expect(readout).toContainText('指法提示已隐藏');
  await expect(piano.locator('[data-hand]')).toHaveCount(0);
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(page.getByRole('group', { name: '钢琴键盘', exact: true })).toBeVisible();
});

test('a failed model load restores the playable standard keyboard', async ({ page }) => {
  await page.route('**/hands/right.glb', route => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: '3D 指法' }).click();
  await expect(page.getByRole('alert')).toContainText('已切回普通琴键');
  await expect(page.getByRole('button', { name: 'C4 琴键', exact: true })).toBeEnabled();
});
