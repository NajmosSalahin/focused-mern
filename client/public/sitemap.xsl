<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:template match="/">
<html lang="en">
<head>
  <title>Sitemap — FOCUS</title>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5; color: #1a1a2e; padding: 2rem;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 {
      font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;
      color: #16213e;
    }
    p { color: #555; margin-bottom: 1.5rem; font-size: 0.9rem; }
    table {
      width: 100%; border-collapse: collapse;
      background: #fff; border-radius: 8px; overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    th {
      text-align: left; padding: 0.75rem 1rem;
      background: #16213e; color: #fff; font-weight: 600; font-size: 0.85rem;
    }
    td { padding: 0.75rem 1rem; border-top: 1px solid #eee; font-size: 0.9rem; }
    tr:hover td { background: #f0f4ff; }
    a { color: #0f3460; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .priority {
      display: inline-block; padding: 0.15rem 0.5rem;
      border-radius: 4px; font-size: 0.8rem; font-weight: 600;
    }
    .priority-high { background: #d4edda; color: #155724; }
    .footer {
      margin-top: 1.5rem; font-size: 0.8rem; color: #888;
      text-align: center;
    }
  </style>
</head>
<body>
<div class="container">
  <h1>Sitemap — FOCUS</h1>
  <p>
    Total URLs: <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/>
  </p>
  <table>
    <thead>
      <tr>
        <th>URL</th>
        <th>Priority</th>
      </tr>
    </thead>
    <tbody>
      <xsl:for-each select="sitemap:urlset/sitemap:url">
        <tr>
          <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
          <td>
            <span class="priority priority-high">
              <xsl:value-of select="sitemap:priority"/>
            </span>
          </td>
        </tr>
      </xsl:for-each>
    </tbody>
  </table>
  <div class="footer">
    Generated for <a href="https://focused-4l3h.onrender.com">FOCUS</a>
  </div>
</div>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
