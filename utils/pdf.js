// ESM module
import puppeteer from "puppeteer";

/**
 * Render HTML to a PDF Buffer
 */
export async function htmlToPdfBuffer(html, { format = "A4" } = {}) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format, printBackground: true });
    return pdf; // Buffer
  } finally {
    await browser.close();
  }
}
