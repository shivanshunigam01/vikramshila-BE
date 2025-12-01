app.get("/sitemap.xml", async (req, res) => {
  const products = await Product.find().select("_id updatedAt");

  let xml = `<?xml version="1.0" encoding="UTF-8"?> 
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  const staticUrls = [
    "/",
    "/products",
    "/about",
    "/services",
    "/finance",
    "/offers",
    "/videos",
    "/contact",
    "/new-launches",
    "/blogs",
    "/faq",
  ];

  staticUrls.forEach((url) => {
    xml += `<url><loc>https://vikramshilaautomobiles.com${url}</loc><changefreq>weekly</changefreq></url>`;
  });

  products.forEach((p) => {
    xml += `<url>
              <loc>https://vikramshilaautomobiles.com/products/${p._id}</loc>
              <lastmod>${p.updatedAt.toISOString()}</lastmod>
              <changefreq>weekly</changefreq>
            </url>`;
  });

  xml += `</urlset>`;
  res.header("Content-Type", "application/xml");
  return res.send(xml);
});
