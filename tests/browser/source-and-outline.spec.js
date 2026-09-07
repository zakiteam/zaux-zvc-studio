import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import JSZip from 'jszip';
import palette from '../../app/data/catalog/palette.js';

async function open(page) {
  await page.goto('/');
  await expect(page.frameLocator('iframe').locator('h1')).toContainText('Le tue idee.', { timeout: 30000 });
}
async function insertSource(page) {
  await page.locator('.zb-library-card').filter({ hasText: 'Starter Hero' }).getByRole('button', { name: 'Inserisci una copia', exact: true }).click();
}
test('file ZVC loads automatically, runs conditional code, exports original JS and converts a copy', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await open(page);
  await insertSource(page);
  const stage = page.frameLocator('iframe');
  const source = stage.locator('[data-zb-instance]').last();
  await expect(source).toContainText('Una base scritta in codice.');
  await expect(source.locator('a')).toContainText('Scopri di più');
  await page.getByRole('textbox', { name: 'Titolo', exact: true }).fill('Titolo da codice');
  await page.getByRole('textbox', { name: 'Titolo', exact: true }).press('Tab');
  await page.getByRole('combobox', { name: 'Mostra pulsante', exact: true }).selectOption('false');
  await expect(source.locator('a')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Testo pulsante', exact: true })).toHaveCount(0);
  await expect(source.locator('[data-zb-node]')).toHaveCount(0);
  await expect(page.locator('.zb-save-status')).toContainText('Salvato');
  await page.reload();
  await expect(source).toContainText('Titolo da codice');
  await source.getByText('Titolo da codice', { exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Mostra pulsante', exact: true })).toHaveValue('false');

  await page.getByRole('button', { name: 'Esporta', exact: true }).click();
  await page.getByRole('dialog').getByRole('combobox', { name: 'Esporta', exact: true }).selectOption('component');
  await page.getByRole('combobox', { name: 'Format', exact: true }).selectOption('runtime');
  const runtime = JSON.parse(await page.getByRole('textbox', { name: 'Export', exact: true }).inputValue());
  expect(runtime.ZVCName).toBe('ZVCStarterHero');
  expect(runtime.props.components[0].children[0].props.title).toBe('Titolo da codice');
  expect(JSON.stringify(runtime)).not.toContain('sourceKey');
  await page.getByRole('combobox', { name: 'Format', exact: true }).selectOption('js');
  await page.getByRole('button', { name: 'StarterHero.zvc.js', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Export', exact: true })).toHaveValue(/gv\('showButton'\) \?/);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Scarica pacchetto JS', exact: true }).click();
  const zip = await JSZip.loadAsync(await fs.readFile(await (await downloadPromise).path()));
  expect(await zip.file('StarterHero.zvc.js').async('string')).toContain("gv('showButton') ?");
  expect(await zip.file('data/StarterHero.defaults.js').async('string')).toContain('"showButton": false');
  expect(await zip.file('data/StarterHero.defaults.js').async('string')).toContain('Titolo da codice');
  await page.getByRole('dialog').getByRole('button', { name: 'Chiudi', exact: true }).click();

  await page.getByRole('button', { name: 'Converti in visuale', exact: true }).click();
  await expect(source.locator('[data-zb-node]')).toHaveCount(2);
  await expect(source).toContainText('Titolo da codice');
  await expect(page.locator('.zb-source-info')).toHaveCount(0);
  await page.getByRole('button', { name: 'Annulla modifica', exact: true }).click();
  await expect(page.locator('.zb-source-info')).toBeVisible();
  await expect(source.locator('a')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Libreria ZVC', exact: true }).click();
  await insertSource(page);
  await expect(stage.locator('[data-zb-instance]').last()).toContainText('Una base scritta in codice.');
  await expect(stage.locator('[data-zb-instance]').last().locator('a')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/source-zvc.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('whitelist limits the palette and outline actions duplicate/delete without opening properties', async ({ page }) => {
  await open(page);
  await page.getByRole('tab', { name: 'Elementi', exact: true }).click();
  await expect(page.locator('.zb-element-list button')).toHaveCount(palette.length);
  expect(await page.locator('.zb-element-list button > span:nth-child(2)').allTextContents()).toEqual(palette.map(item => item.name));
  await page.getByRole('tab', { name: 'Struttura', exact: true }).click();
  await page.getByRole('tab', { name: 'Contenuti', exact: true }).click();
  const stage = page.frameLocator('iframe');
  const count = await stage.locator('[data-zb-node]').count();
  const duplicate = page.getByRole('button', { name: 'Duplica: IntroText', exact: true }).first();
  await expect.poll(() => duplicate.locator('use').evaluate(node => node.getBBox().width)).toBeGreaterThan(0);
  await duplicate.click();
  await expect(stage.locator('[data-zb-node]')).toHaveCount(count + 1);
  await expect(page.getByRole('tab', { name: 'Contenuti', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Elimina: IntroText', exact: true }).first().click();
  await expect(stage.locator('[data-zb-node]')).toHaveCount(count);
  const instances = await stage.locator('[data-zb-instance]').count();
  await page.getByRole('button', { name: 'Duplica: Welcome Section', exact: true }).click();
  await expect(stage.locator('[data-zb-instance]')).toHaveCount(instances + 1);
  await page.getByRole('button', { name: 'Elimina: Welcome Section (copia)', exact: true }).click();
  await expect(stage.locator('[data-zb-instance]')).toHaveCount(instances);
  await page.screenshot({ path: 'test-results/outline.png', fullPage: true });
});
test('source library bases are protected and configurable copies retain their defaults after reload', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Modifica nella libreria: Starter Hero', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Titolo', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Crea copia configurabile', exact: true }).click();
  await page.getByRole('textbox', { name: 'Titolo', exact: true }).fill('Default di una copia');
  await page.getByRole('textbox', { name: 'Titolo', exact: true }).press('Tab');
  await expect(page.frameLocator('iframe').locator('h3')).toHaveText('Default di una copia');
  await expect(page.locator('.zb-save-status')).toContainText('Salvato');
  await page.reload();
  await page.locator('.zb-card-name').filter({ hasText: 'Starter Hero (copia)' }).click();
  await expect(page.getByRole('textbox', { name: 'Titolo', exact: true })).toHaveValue('Default di una copia');
});
