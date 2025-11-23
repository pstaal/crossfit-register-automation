import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import dotenv from 'dotenv';

dotenv.config();
puppeteerExtra.use(StealthPlugin());

(async () => {
  const browser = await puppeteerExtra.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
    executablePath: '/usr/bin/google-chrome-stable'
  });

  const page = await browser.newPage();

  // Go to login
  await page.goto('https://cfc.sportbitapp.nl/web/nl/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('div.login__button');
  await page.click('div.login__button');

  // Fill in credentials
  await page.type('input[formcontrolname="username"]', 'peter@bind.nl');
  await page.type('input[formcontrolname="password"]', process.env.PASSWORD);

  // Find and click "Inloggen" button
  await page.waitForSelector('button span');
  const spans = await page.$$('button span');
  for (const span of spans) {
    const text = await page.evaluate(el => el.textContent.trim(), span);
    if (text === 'Inloggen') {
      const btn = await page.evaluateHandle(el => el.closest('button'), span);
      await btn.click();
      break;
    }
  }

  const buttonSelector = 'a.calendar-dv__header__nav__right';
  const dateSpanSelector = 'span:has(i.fa-calendar.is-hidden-touch)';

  await page.waitForSelector(buttonSelector);
  await page.waitForSelector(dateSpanSelector);

  for (let i = 0; i < 6; i++) {
    const prev = await page.$eval(dateSpanSelector, el =>
      el.innerText.replace(/\s+/g, ' ').trim()
    );
    console.log('Previous:', prev);

    await page.click(buttonSelector);

    await page.waitForFunction(
      (sel, old) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        return el.innerText.replace(/\s+/g, ' ').trim() !== old;
      },
      { timeout: 15000 },
      dateSpanSelector,
      prev
    );
  }

  await page.waitForSelector('.calendar-card');
  const cards = await page.$$('.calendar-card');
  for (const card of cards) {
    const hasTitle = await page.evaluate(el => {
      const s = el.querySelector('span.title');
      return s && s.textContent.trim() === 'WOD';
    }, card);

    const hasTime = await page.evaluate(el => {
      const s = el.querySelector('span:not(.title)');
      return s && s.textContent.trim() === '10:30 - 11:30';
    }, card);

    if (hasTitle && hasTime) {
      await card.click();
      break;
    }
  }

  await page.waitForSelector('button.mat-mdc-button-base.mat-mdc-unelevated-button.mat-primary', { visible: true });
  const buttons = await page.$$('button.mat-mdc-button-base.mat-mdc-unelevated-button.mat-primary');
  for (const b of buttons) {
    const t = await page.evaluate(el => el.innerText.replace(/\s+/g, ' ').trim(), b);
    if (t.includes('Aanmelden')) {
      await b.click();
      break;
    }
  }

  await browser.close();
})();
