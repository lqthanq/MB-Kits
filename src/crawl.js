const axios = require("axios");
const cheerio = require("cheerio");

(async function () {
  for (let i = 1; i <= 427; i++) {
    console.log('page: ', i);
    const url = `https://bluefink.com/category/3d-polo-shirt/page/${i}`;
    const res = await axios
      .get(url, {
        headers: { "Accept-Encoding": "gzip,deflate,compress" },
      })
      .catch((err) => {
        console.log(err);
      });

    if (typeof res === "undefined") continue;
    const $ = cheerio.load(res.data);

    const products = [];
    $(".product").each(function () {
      const cls = $(this).attr("class");
      const pt = /post-\d+/i;
      const match = (cls || "").match(pt);
      const [_, itemId] = ((match || [])[0] || "").split(/\-/);
      const src = $(this).find(".box-image a img").attr("data-src");

      const srcPT = /resize=.+\&/i;
      const m = src ? src.replace(srcPT, "") : null;
      const mockup = m ? [m] : [];

      const source = "https://bluefink.com";
      const url = $(this).find(".box-image a").attr("href");

      let t = $(this).find(".title-wrapper .product-title a").text();
      const tPT = /Polo Shirt$/i;
      t = (t || "").trim();
      t = t.replace(tPT, "Polo Shirt Golf Shirt, 3D All Over Print Shirt");

      products.push({
        itemId,
        title: t,
        source,
        url,
        mockup,
      });
    });

    //////////// Push to MB
    async function pushToMB(products) {
      console.log("products:", products.length);

      console.log("---> Running push product to MB");
      const res = await axios.post(
        "https://api.merchbridge.com/query",
        {
          operationName: "createAssortment",
          variables: {
            // storeIds: ["LXyq4jKuoU"],
            storeIds: [],
            items: products,
          },
          query:
            "mutation createAssortment($storeIds: [ID!], $items: [NewAssortmentItem!]!) {createAssortment(storeIds: $storeIds, items: $items)}",
        },
        {
          headers: {
            "Content-Type": "application/json",
            authorization:
              // khactien
              // "Bearer api-eb46af9a-4950-4da5-80d2-6b5dfb1fd525",
              // trangvit
              // "Bearer api-f4c8a5dc-3867-476b-a701-89a1917a1c18",
              // hoangtrang
              // "Bearer api-e067b999-c45d-45d1-98c0-d989d1aaa3ab",
              // boss Thien
              // "Bearer api-d6dee321-5952-47bb-a7b0-9a0bdfdeb7a6",
              // anh binh
              // "Bearer api-1be241ae-1bca-4930-859e-eb58bebf3314",
              "Bearer api-40b5dced-c2bd-406d-97d6-f3cdcef9c46f",
            // "Bearer api-755cc2a1-ce8e-4a69-9b41-2f62e3dbd9be",
          },
        }
      );
      if (res.data.errors != null) {
        console.log("Error push to MB: ", res.data.errors);
        return false;
      }
      console.log("---> Push to MB success");
      return true;
    }

    if (i > 1 ) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    await pushToMB(products);
  }
})();
