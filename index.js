const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));

// Proxy Route to handle URL requests
app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).send('URL is required');
  }

  try {
    // Fetch the requested page using Axios
    const response = await axios.get(url);
    const html = response.data;

    // Use Cheerio to parse the HTML and modify links
    const $ = cheerio.load(html);

    // Rewrite all image sources to go through the proxy
    $('img').each((i, el) => {
      let src = $(el).attr('src');
      if (src && !/^https?:\/\//.test(src)) { // If it's not a fully qualified URL
        if (src.startsWith('//')) {
          src = 'https:' + src;
        } else if (!src.startsWith('http')) {
          const baseUrl = new URL(url);
          src = baseUrl.origin + src;
        }

        $(el).attr('src', `/proxy?url=${encodeURIComponent(src)}`); // Point to the proxy for the image
      }
    });

    // Rewrite all anchor (link) hrefs to route through proxy
    $('a').each((i, el) => {
      let href = $(el).attr('href');
      if (href && !/^https?:\/\//.test(href)) {
        if (href.startsWith('//')) {
          href = 'https:' + href;
        } else if (!href.startsWith('http')) {
          const baseUrl = new URL(url);
          href = baseUrl.origin + href;
        }

        $(el).attr('href', `/proxy?url=${encodeURIComponent(href)}`);
      }
    });

    // Rewrite CSS and JS URLs
    $('link[rel="stylesheet"], script').each((i, el) => {
      let src = $(el).attr('src') || $(el).attr('href');
      if (src && !/^https?:\/\//.test(src)) {
        if (src.startsWith('//')) {
          src = 'https:' + src;
        } else if (!src.startsWith('http')) {
          const baseUrl = new URL(url);
          src = baseUrl.origin + src;
        }

        $(el).attr('href', `/proxy?url=${encodeURIComponent(src)}`);
      }
    });

    // Send the modified HTML as response
    res.send($.html());

  } catch (error) {
    res.status(500).send('Error fetching the page');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});