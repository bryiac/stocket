import puppeteer from "puppeteer";
import merge from "deepmerge";

let browser = null;
let cache = {};

const get = async ({ symbols, url, selectors }: { symbols: string[], url: string, selectors: { [key: string]: string } }, callback: (results: { [key: string]: string }) => void) => {

  if (browser === null) {
    browser = await puppeteer.launch();
  }

  for (const symbol of symbols) {
    const page = await browser.newPage();

    await page.goto(url.replace("*", symbol));

    await page.exposeFunction("update", (results) => { 
      cache[symbol] = merge(cache[symbol], results);
      
      callback(cache[symbol]);
    })

    await page.evaluate((selectors) => {
      for (const selector in selectors) {
        const target = document.querySelector(selectors[selector]);
        let previous;

        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (previous !== mutation.target.textContent) {
              // @ts-ignore
              update({ [selector]: mutation.target.textContent });
            }
            
            previous = mutation.target.textContent;
          }
        })

        if (target) {
          observer.observe(target, { attributes: true });
        } else {
          throw new Error(`Invalid selector ${selector}: ${selectors[selector]}`);
        }
      }
    }, selectors)
  }
};

export { get };