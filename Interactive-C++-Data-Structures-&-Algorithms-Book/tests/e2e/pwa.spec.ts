import { test, expect } from '@playwright/test';

test('production PWA scopes to its base and serves visited pages offline', async ({ page, context }) => {
  await page.goto('./');

  const manifest = await page.evaluate(async () => {
    const manifestUrl = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!.href;
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
    const data = await response.json();
    const resolved = {
      start: new URL(data.start_url, manifestUrl).pathname,
      scope: new URL(data.scope, manifestUrl).pathname,
      base: new URL('./', manifestUrl).pathname,
      icons: await Promise.all(data.icons.map(async (icon: { src: string; sizes: string; purpose?: string }) => {
        const iconResponse = await fetch(new URL(icon.src, manifestUrl));
        if (!iconResponse.ok) throw new Error(`Icon request failed: ${icon.src}`);
        const bitmap = await createImageBitmap(await iconResponse.blob());
        const size = [bitmap.width, bitmap.height];
        bitmap.close();
        return { ...icon, size };
      })),
    };
    return { ...data, ...resolved };
  });

  expect(manifest.name).toBe('The Interactive C++ Book');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start).toBe(manifest.base);
  expect(manifest.scope).toBe(manifest.base);
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ sizes: '192x192', size: [192, 192] }),
    expect.objectContaining({ sizes: '512x512', size: [512, 512] }),
    expect.objectContaining({ sizes: '512x512', purpose: 'maskable', size: [512, 512] }),
  ]));

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>(resolve => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
        setTimeout(resolve, 5000);
      });
    }
  });
  const worker = await page.evaluate(() => {
    const controller = navigator.serviceWorker.controller;
    return controller ? { script: controller.scriptURL } : null;
  });
  expect(worker).not.toBeNull();
  const scope = await page.evaluate(() => navigator.serviceWorker.ready.then(registration => registration.scope));
  expect(new URL(scope).pathname).toBe(manifest.base);
  expect(new URL(worker!.script).pathname).toBe(`${manifest.base}sw.js`);
  const devtools = await context.newCDPSession(page);
  const browserManifest = await devtools.send('Page.getAppManifest');
  expect(browserManifest.errors).toEqual([]);
  const installability = await devtools.send('Page.getInstallabilityErrors');
  expect(installability.installabilityErrors.map(error => error.errorId).filter(id => id !== 'in-incognito')).toEqual([]);
  await devtools.detach();

  const cachedShell = await page.evaluate(async () => {
    const names = await caches.keys();
    const cache = await caches.open(names.find(name => name.startsWith('interactive-cpp-book-'))!);
    return (await cache.keys()).map(request => new URL(request.url).pathname);
  });
  expect(cachedShell).toContain(manifest.base);
  expect(cachedShell).toContain(`${manifest.base}chapters/00-cpp-foundations/`);
  expect(cachedShell.some(path => path.endsWith('.css'))).toBe(true);

  const home = new URL(manifest.base, page.url()).href;
  const chapterZero = new URL('chapters/00-cpp-foundations/', home).href;
  const chapterOne = new URL('chapters/01-singly-linked-list/', home).href;
  const source = new URL('source/chapter-00/CppFoundations.hpp', home).href;
  await page.goto(chapterZero);
  await expect(page.locator('body')).toHaveAttribute('data-chapter-number', '00');
  await page.getByRole('navigation', { name: 'Adjacent chapters' }).getByRole('link').click();
  await expect(page.locator('body')).toHaveAttribute('data-chapter-number', '01');
  await expect(page).toHaveURL(chapterOne);
  await page.getByRole('navigation', { name: 'Adjacent chapters' }).getByRole('link').first().click();
  await expect(page).toHaveURL(chapterZero);
  const sourceAvailable = await page.evaluate(async url => {
    const response = await fetch(url);
    return response.ok && (await response.text()).includes('namespace foundations');
  }, source);
  expect(sourceAvailable).toBe(true);

  await context.setOffline(true);
  await page.goto(home);
  await expect(page.locator('body')).toHaveAttribute('data-chapter-number', '00');
  await page.goto(chapterZero);
  await expect(page.locator('body')).toHaveAttribute('data-chapter-number', '00');
  await page.getByRole('navigation', { name: 'Adjacent chapters' }).getByRole('link').click();
  await expect(page.locator('body')).toHaveAttribute('data-chapter-number', '01');
  await expect(page).toHaveURL(chapterOne);
  await page.getByRole('navigation', { name: 'Adjacent chapters' }).getByRole('link').first().click();
  await expect(page).toHaveURL(chapterZero);
  expect(await page.evaluate(async url => {
    const response = await fetch(url);
    return response.ok && (await response.text()).includes('namespace foundations');
  }, source)).toBe(true);

  await page.goto(new URL('chapters/02-stack/', home).href);
  await expect(page.getByRole('heading', { name: 'You’re offline.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open the saved book home' })).toHaveAttribute('href', manifest.base);
});
