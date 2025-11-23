import puppeteer from 'puppeteer-extra'; // puppeteer-extra gebruiken
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { computeExecutablePath } from '@puppeteer/browsers';
puppeteer.use(StealthPlugin());
import dotenv from 'dotenv';
dotenv.config();

(async () => {
// Launch the browser and open a new blank page.
  const chromiumPath = computeExecutablePath({
    browser: "chromium",
    channel: "stable"
  });

  console.log("Using Chromium at:", chromiumPath);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromiumPath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  });

  const page = await browser.newPage();


// Navigate the crossfit Culemborg
await page.goto('https://cfc.sportbitapp.nl/web/nl/login');

// Navigeer naar de loginpagina van Crossfit Culemborg
  await page.goto('https://cfc.sportbitapp.nl/web/nl/login',{
    waitUntil: 'networkidle2'
  });

  await page.waitForSelector('div.login__button'); // Wachten tot de knop verschijnt
  await page.click('div.login__button');



// Fill in the login form
  await page.type('input[formcontrolname="username"]', 'peter@bind.nl');// Replace 'your_username' with your actual username
  await page.type('input[formcontrolname="password"]', process.env.PASSWORD); // Replace 'your_password' with your actual password

  await page.waitForSelector('button span'); // Wacht tot de 'span' in een 'button' zichtbaar wordt

// Vind alle 'span'-elementen in 'button'-tags
  const spans = await page.$$('button span');

// Loop door de span-elementen en controleer de tekst
  for (const span of spans) {
    const text = await page.evaluate(el => el.textContent.trim(), span); // Haal de tekst van de span op
    if (text === 'Inloggen') {
      const parentButton = await page.evaluateHandle(el => el.closest('button'), span); // Vind de bovenliggende knop
      await parentButton.click(); // Klik op de bovenliggende knop
      break;
    }
  }

  const buttonSelector = 'a.calendar-dv__header__nav__right';
  const dateSpanSelector = 'span:has(i.fa-calendar.is-hidden-touch)';

  await page.waitForSelector(buttonSelector);
  await page.waitForSelector(dateSpanSelector);

  for (let i = 0; i < 6; i++) {

    const previousText = await page.$eval(dateSpanSelector, el =>
        el.innerText.replace(/\s+/g, ' ').trim()
    );

    console.log("Previous:", previousText);

    await page.click(buttonSelector);

    await page.waitForFunction(
        (sel, oldText) => {
          const el = document.querySelector(sel);
          if (!el) return false;

          const newText = el.innerText.replace(/\s+/g, ' ').trim();
          return newText !== oldText;
        },
        { timeout: 15000 },  // increased timeout
        dateSpanSelector,
        previousText
    );
  }


  await page.waitForSelector('.calendar-card');

// Zoek alle 'calendar-card'-divs
  const cards = await page.$$('.calendar-card');

// Loop door de divs en controleer of beide spans aanwezig zijn
  for (const card of cards) {
    const hasTitle = await page.evaluate(el => {
      const titleSpan = el.querySelector('span.title');
      return titleSpan && titleSpan.textContent.trim() === 'WOD'; // Check span titel
    }, card);

    const hasTime = await page.evaluate(el => {
      const timeSpan = el.querySelector('span:not(.title)'); // Een span zonder class "title"
      return timeSpan && timeSpan.textContent.trim() === '10:30 - 11:30'; // Check tijd
    }, card);

    // Als beide spans aanwezig zijn, klik op het 'card'-element
    if (hasTitle && hasTime) {
      await card.click();
      break;
    }
  }

  await page.waitForSelector('button.mat-mdc-button-base.mat-mdc-unelevated-button.mat-primary', { visible: true });
  const buttons = await page.$$('button.mat-mdc-button-base.mat-mdc-unelevated-button.mat-primary');

  for (const button of buttons) {
    const text = await page.evaluate(
        el => el.innerText.replace(/\s+/g, ' ').trim(),
        button
    );


    if (text.includes('Aanmelden')) {
      await button.click();
      break;
    }
  }
  // Sluit de browser
  await browser.close();

})();
