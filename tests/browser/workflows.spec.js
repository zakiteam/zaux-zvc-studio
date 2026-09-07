import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import JSZip from 'jszip';

async function open(page) {
  await page.goto('/');
  await expect(page.frameLocator('iframe').locator('h1')).toContainText('Le tue idee.', { timeout: 30000 });
}
async function drag(page, source, target, fraction = .5) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 8, { steps: 6 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height * fraction, { steps: 20 });
  await page.mouse.up();
}

test('content edits persist after reload, undo/redo work, and library copies stay independent', async ({ page }) => {
  await open(page);
  await page.getByRole('tab', { name: 'Contenuti', exact: true }).click();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Una copia indipendente');
  await page.getByRole('textbox', { name: 'Title', exact: true }).press('Tab');
  const stage = page.frameLocator('iframe');
  await expect(stage.locator('h1')).toHaveText('Una copia indipendente');
  await page.getByRole('button', { name: 'Annulla modifica', exact: true }).click();
  await expect(stage.locator('h1')).toContainText('Le tue idee.');
  await page.getByRole('button', { name: 'Ripristina modifica', exact: true }).click();
  await expect(stage.locator('h1')).toHaveText('Una copia indipendente');
  await expect(page.locator('.zb-save-status')).toContainText('Salvato');
  await page.reload();
  await expect(stage.locator('h1')).toHaveText('Una copia indipendente');
  await page.getByRole('button', { name: 'Inserisci una copia', exact: true }).first().click();
  await expect(stage.locator('h1')).toHaveCount(2);
  await expect(stage.locator('h1').last()).toContainText('Le tue idee.');
  await page.getByRole('tab', { name: 'Contenuti', exact: true }).click();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Seconda copia');
  await page.getByRole('textbox', { name: 'Title', exact: true }).press('Tab');
  await expect(stage.locator('h1').first()).toHaveText('Una copia indipendente');
  await expect(stage.locator('h1').last()).toHaveText('Seconda copia');
});

test('visual selection and real drag from palette into iframe update the component tree', async ({ page }) => {
  await open(page);
  const stage = page.frameLocator('iframe');
  await stage.locator('h1').click();
  await expect(page.locator('.zb-node-heading strong')).toHaveText('IntroText');
  await page.getByRole('tab', { name: 'Elementi', exact: true }).click();
  await page.getByRole('searchbox').fill('Paragraph');
  const before = await stage.locator('[data-zb-node]').count();
  await drag(page, page.locator('.zb-element-list button').filter({ hasText: 'Paragraph' }).first(), stage.locator('h1'), .1);
  await expect(stage.locator('[data-zb-node]')).toHaveCount(before + 1);
  await expect(page.locator('.zb-node-heading strong')).toHaveText('Paragraph');
  await page.getByRole('button', { name: 'Annulla modifica', exact: true }).click();
  await expect(stage.locator('[data-zb-node]')).toHaveCount(before);
  await page.getByRole('button', { name: 'Mobile', exact: true }).click();
  await expect.poll(() => stage.locator('body').evaluate(() => window.innerWidth)).toBe(390);
  await page.screenshot({ path: 'test-results/mobile-editor.png', fullPage: true });
});

test('create and name a ZVC, add fields, bind a property and export matching JS files', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Nuovo ZVC', exact: true }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Promo');
  await page.getByRole('button', { name: 'Salva', exact: true }).click();
  await page.getByRole('searchbox').fill('IntroText');
  await page.locator('.zb-element-list button').filter({ hasText: 'IntroText' }).click();
  await page.getByRole('tab', { name: 'Campi', exact: true }).click();
  await page.getByLabel('Chiave', { exact: true }).fill('headline');
  await page.getByLabel('Etichetta', { exact: true }).fill('Headline');
  await page.locator('.zb-new-field button[type=submit]').click();
  await page.locator('.zb-field-card summary').click();
  await page.getByRole('textbox', { name: 'headline default', exact: true }).fill('Titolo configurabile');
  await page.getByRole('textbox', { name: 'headline default', exact: true }).press('Tab');
  await page.getByRole('tab', { name: 'Proprietà', exact: true }).click();
  await page.getByRole('combobox', { name: 'Collega a un campo: title', exact: true }).selectOption('headline');
  await expect(page.frameLocator('iframe').locator('h3')).toHaveText('Titolo configurabile');
  await page.getByRole('button', { name: 'Esporta', exact: true }).click();
  await page.getByRole('dialog').getByRole('combobox', { name: 'Esporta', exact: true }).selectOption('component');
  await page.getByRole('combobox', { name: 'Format', exact: true }).selectOption('js');
  await expect(page.getByRole('textbox', { name: 'Export', exact: true })).toHaveValue(/gv\("headline"\)/);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Scarica pacchetto JS', exact: true }).click();
  const download = await downloadPromise;
  const zip = await JSZip.loadAsync(await fs.readFile(await download.path()));
  expect(zip.file('Promo.zvc.js')).not.toBeNull();
  expect(zip.file('Promo.meta.js')).not.toBeNull();
  expect(zip.file('data/Promo.defaults.js')).not.toBeNull();
  expect(await zip.file('data/Promo.defaults.js').async('string')).toContain('Titolo configurabile');
});

test('JSON workspace download/import and template creation restore the saved workspace', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Esporta', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Scarica JSON', exact: true }).click();
  const download = await downloadPromise;
  const content = await fs.readFile(await download.path(), 'utf8');
  const data = JSON.parse(content);
  expect(data.kind).toBe('workspace');
  await page.getByRole('dialog').getByRole('button', { name: 'Chiudi', exact: true }).click();
  await page.getByRole('button', { name: 'Nuovo template', exact: true }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Landing');
  await page.getByRole('button', { name: 'Salva', exact: true }).click();
  await expect(page.locator('.zb-canvas-label strong')).toHaveText('Landing');
  await page.getByRole('button', { name: 'Importa', exact: true }).click();
  await page.getByRole('textbox', { name: 'Oppure incolla JSON', exact: true }).fill(content);
  await page.getByRole('dialog').getByRole('button', { name: 'Importa', exact: true }).click();
  await page.getByRole('button', { name: 'Conferma', exact: true }).click();
  await expect(page.locator('.zb-canvas-label strong')).toHaveText('Homepage');
  await expect(page.locator('.zb-project-switch option')).toHaveCount(1);
});

test('invalid stored JSON is preserved until explicit recovery choice', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('zx_builder_workspace_v1', '{broken'));
  await open(page);
  await expect(page.getByRole('alert')).toContainText('non è leggibile');
  await page.getByRole('button', { name: 'Inserisci una copia', exact: true }).first().click();
  expect(await page.evaluate(() => localStorage.getItem('zx_builder_workspace_v1'))).toBe('{broken');
  await page.getByRole('button', { name: 'Salva questa sessione', exact: true }).click();
  await page.getByRole('button', { name: 'Conferma', exact: true }).click();
  await expect.poll(() => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('zx_builder_workspace_v1')).schemaVersion; } catch { return null; } })).toBe(1);
});
