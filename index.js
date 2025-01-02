const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

(async () => {
  const config = await fs.readFile("./config/config.json", "utf8");
  const { numberOfClicks, urls, bearerToken } = JSON.parse(config);

  if (!urls || urls.length === 0) {
    console.error("==> Error: No URLs defined in the configuration.");
    process.exit(1);
  }

  console.log(`==> ${urls.length} URLs defined`);

  const browsers = await Promise.all(
    urls.map(() =>
      puppeteer.launch({
        args: [
          "--disable-setuid-sandbox",
          "--no-sandbox",
          "--single-process",
          "--no-zygote",
        ],
        executablePath:
          process.env.NODE_ENV === "production"
            ? process.env.PUPPETEER_EXECUTABLE_PATH
            : puppeteer.executablePath(),
        headless: true,
      })
    )
  );

  await Promise.all(
    urls.map(async (url, index) => {
      const browserIndex = index % browsers.length;
      const browser = browsers[browserIndex];
      const page = await browser.newPage();

      // Add Bearer authentication
      await page.setExtraHTTPHeaders({
        Authorization: `Bearer ${bearerToken}`,
      });

      await performActions(page, url, numberOfClicks, index);
    })
  );
})();

async function performActions(page, url, numberOfClicks, index) {
  const accountNumber = `Account${index + 1}`;

  while (true) {
    try {
      console.log(`==> Your service is live 🎉`);
      console.log(`==> 🔍Checking for required elements on ${accountNumber}`);

      await page.goto(url, { waitUntil: "networkidle0" });

      const balanceSelector = "h1._h1_tffsq_1";
      const imageSelector = "div#ex1-layer._tapContent_igohf_31 img";

      await page.waitForSelector(imageSelector, { visible: true, timeout: 60000 });
      await page.waitForSelector(balanceSelector, { visible: true, timeout: 60000 });
      console.log(`==> Found necessary elements on ${url}`);

      const balance = await page.$eval(balanceSelector, el => el.textContent.trim());
      console.log(`==> | Success | ${accountNumber} Balance: 🟡 ${balance} |`);

      await delay(1000);

      for (let i = 0; i < numberOfClicks; i++) {
        await page.click(imageSelector);
        await delay(100);
      }

      console.log(`==> Finished ${numberOfClicks} clicks for ${accountNumber}. Pausing for 10 minutes...`);
      await delay(10 * 60 * 1000); // 10 minutes delay
    } catch (error) {
      console.error(`==> Error performing actions on ${url}:`, error);
    }
  }
        }
