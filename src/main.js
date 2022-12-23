const puppeterr = require("puppeteer");
const axios = require("axios");
const fs = require("fs");

const resource = "https://pomona-unique.myshopify.com/collections/polo";
const endpoint = "https://api.merchbridge.com/query"; //"http://localhost:8080/query";
const apiKey = "api-1be241ae-1bca-4930-859e-eb58bebf3314"; // "api-17776366-555f-4b52-ac9c-69ba2af9d21b"; //

(async function () {
  const totalPage = 10; //1104;
  let fromPage = 1;
  let hasReport = false;
  try {
    const br = await puppeterr.launch({ headless: false });
    const page = await br.newPage();

    while (fromPage < totalPage) {
      await page.goto(resource + "?page=" + fromPage);
      // Extra
      // Wait for the product-grid
      const st = ".product-grid .grid__item .card a.full-unstyled-link";
      await page.waitForSelector(st);
      const products = await page.evaluate((st) => {
        return [...document.querySelectorAll(st)].map((item) => {
          const { href, textContent } = item;
          return {
            url: href,
            title: textContent?.trim(),
          };
        });
      }, st);
      let productsInfo = await Promise.all(
        products.map(async (p) => {
          const { url } = p;
          const newP = await br.newPage();
          await newP.goto(`${url}.js`);
          await newP.waitForSelector("pre");

          const pre = await newP.evaluate((d) => {
            const res = document.querySelector(d);
            return res.textContent;
          }, "pre");
          if (typeof pre === "string") {
            const { id, type, images, featured_image } = JSON.parse(pre);

            let mergeImages = images;
            if (images.every((img) => img !== featured_image)) {
              mergeImages.unshift(featured_image);
            }
            mergeImages = mergeImages.map((img) => {
              if (img.startsWith("https:")) {
                return img;
              }
              return "https:" + img;
            });
            await newP.close();

            return {
              ...p,
              itemId: id + "",
              niche: type,
              mockup: mergeImages,
              source: "Shopify",
            };
          }
        })
      );

      const newP = new Map(productsInfo.map((p) => [p.itemId, p]));
      productsInfo = [...newP].map(([, value]) => value);
      console.log(
        "productsInfo ",
        productsInfo.length,
        productsInfo.map(({ itemId }) => itemId)
      );
      if (productsInfo.length > 0) {
        const { data } = await axios.post(
          endpoint,
          {
            variables: {
              items: productsInfo,
            },
            operationName: "createAssortment",
            query: `
          mutation createAssortment($items: [NewAssortmentItem!]!){
            createAssortment(items: $items)
          }
        `,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
          }
        );
        console.log("data:", data);

        if (data?.data?.createAssortment) {
          if (Object.keys(data.data.createAssortment).length > 0) {
            fs.appendFile(
              "./src/reports.json",
              "|" + JSON.stringify(data.data.createAssortment),
              function (err) {
                if (err) console.log("cannot update file");
              }
            );
            hasReport = true;
          }
        }
      }
      fromPage++;
    }
  } catch (err) {
    console.log("err:", err);
  }
})();
