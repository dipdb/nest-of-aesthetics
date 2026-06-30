const http = require('http');
const fs = require('fs');
const path = require('path');
const jsYaml = require('js-yaml');
const { marked } = require('marked');

const PORT = 3000;
const POSTS_DIR = path.join(__dirname, 'content', 'posts');
const SHOP_DIR = path.join(__dirname, 'content', 'shop');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.yml': 'text/yaml',
  '.yaml': 'text/yaml'
};

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true
});

// Helper to parse Markdown to HTML
function parseMarkdown(md) {
  if (!md) return '';
  // Pre-clean escaped headers (Decap visual editor adds backslashes)
  const cleanedMd = md.replace(/\\\\#/g, '#').replace(/\\#/g, '#');
  let html = marked.parse(cleanedMd);

  // marked wraps standalone images in <p> — convert to <figure> with optional caption
  // Use only one pass to avoid double-processing
  html = html.replace(
    /<p>\s*(<img[^>]+>)\s*<\/p>/gi,
    (_, imgTag) => wrapImageInFigure(imgTag)
  );

  // Rewrite relative image paths (e.g., "1.png" -> "/public/uploads/1.png")
  html = html.replace(/<img([^>]+)src="([^"]+)"/gi, (match, beforeSrc, srcValue) => {
    let newSrc = srcValue;
    if (!srcValue.startsWith('/') && !srcValue.startsWith('http://') && !srcValue.startsWith('https://')) {
      if (srcValue.startsWith('public/uploads/')) {
        newSrc = `/${srcValue}`;
      } else if (srcValue.startsWith('uploads/')) {
        newSrc = `/public/${srcValue}`;
      } else {
        newSrc = `/public/uploads/${srcValue}`;
      }
    }
    return `<img${beforeSrc}src="${newSrc}"`;
  });

  return html;
}

function wrapImageInFigure(imgTag) {
  // Only use the title attribute for captions (alt is accessibility text, not a caption)
  const titleMatch = imgTag.match(/title="([^"]*)"/i);
  const caption = titleMatch && titleMatch[1].trim();

  if (caption) {
    return `<figure class="post-figure">${imgTag}<figcaption>${caption}</figcaption></figure>`;
  }
  // No caption — still wrap in figure for consistent styling
  return `<figure class="post-figure">${imgTag}</figure>`;
}


// Function to read and parse a markdown post file
function getPostData(fileName) {
  const filePath = path.join(POSTS_DIR, fileName);
  try {
    const stats = fs.statSync(filePath);
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
    const match = rawContent.match(frontmatterRegex);

    if (match) {
      const yamlBlock = match[1];
      const markdownBody = match[2];
      
      const metadata = jsYaml.load(yamlBlock);
      const parsedBody = parseMarkdown(markdownBody);

      return {
        ...metadata,
        date: metadata.date || stats.mtime.toISOString(),
        body: parsedBody,
        rawBody: markdownBody,
        filename: fileName,
        slug: metadata.slug || path.basename(fileName, '.md')
      };
    } else {
      // No frontmatter, treat whole file as body
      const slug = path.basename(fileName, '.md');
      return {
        date: stats.mtime.toISOString(),
        slug: slug,
        title: slug.replace(/-/g, ' '),
        body: parseMarkdown(rawContent),
        rawBody: rawContent,
        filename: fileName
      };
    }
  } catch (e) {
    console.error(`Error parsing file ${fileName}:`, e);
    return null;
  }
}

// Function to read and parse a markdown shop item file
function getShopItemData(fileName) {
  const filePath = path.join(SHOP_DIR, fileName);
  try {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
    const match = rawContent.match(frontmatterRegex);

    if (match) {
      const yamlBlock = match[1];
      const metadata = jsYaml.load(yamlBlock);

      return {
        ...metadata,
        filename: fileName,
        slug: metadata.slug || path.basename(fileName, '.md')
      };
    } else {
      const slug = path.basename(fileName, '.md');
      return {
        slug: slug,
        title: slug.replace(/-/g, ' '),
        filename: fileName
      };
    }
  } catch (e) {
    console.error(`Error parsing shop item ${fileName}:`, e);
    return null;
  }
}

// Handler for /api/shop
function handleGetShopItems(req, res) {
  if (!fs.existsSync(SHOP_DIR)) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify([]));
  }

  fs.readdir(SHOP_DIR, (err, files) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Internal Server Error');
    }

    const mdFiles = files.filter(f => f.endsWith('.md'));
    const items = mdFiles
      .map(file => getShopItemData(file))
      .filter(item => item !== null && item.published !== false);

    // Sort items by date descending if date exists, otherwise filename
    items.sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      return dateB - dateA;
    });

    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    });
    res.end(JSON.stringify(items));
  });
}

// Handler for /api/posts
function handleGetPosts(req, res) {
  if (!fs.existsSync(POSTS_DIR)) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify([]));
  }

  fs.readdir(POSTS_DIR, (err, files) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Internal Server Error');
    }

    const mdFiles = files.filter(f => f.endsWith('.md'));
    const posts = mdFiles
      .map(file => getPostData(file))
      .filter(post => post !== null && post.published !== false);

    // Sort posts by date descending if date exists, otherwise filename
    posts.sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      return dateB - dateA;
    });

    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    });
    res.end(JSON.stringify(posts));
  });
}

// Handler for /api/post
function handleGetPost(req, res, slug) {
  if (!slug) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('Bad Request: Missing slug');
  }

  if (!fs.existsSync(POSTS_DIR)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Post Not Found');
  }

  fs.readdir(POSTS_DIR, (err, files) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Internal Server Error');
    }

    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    // First pass: check file names matching slug
    let foundFile = mdFiles.find(f => path.basename(f, '.md') === slug);
    let postData = null;

    if (foundFile) {
      postData = getPostData(foundFile);
    } else {
      // Second pass: scan files and read slug inside frontmatter
      for (const file of mdFiles) {
        const data = getPostData(file);
        if (data && data.slug === slug) {
          postData = data;
          break;
        }
      }
    }

    if (!postData) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Post Not Found');
    }

    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    });
    res.end(JSON.stringify(postData));
  });
}

const server = http.createServer((req, res) => {
  // Parse URL and strip query parameters
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  
  // API Interceptors
  if (parsedUrl.pathname === '/api/posts') {
    return handleGetPosts(req, res);
  } else if (parsedUrl.pathname === '/api/shop') {
    return handleGetShopItems(req, res);
  } else if (parsedUrl.pathname === '/api/post') {
    const slug = parsedUrl.searchParams.get('slug');
    return handleGetPost(req, res, slug);
  }

  let filePath = parsedUrl.pathname;

  // Clean URL Routing Mapping
  if (filePath === '/' || filePath === '/home') {
    filePath = '/index.html';
  } else if (filePath === '/blog') {
    filePath = '/blog.html';
  } else if (filePath === '/shop') {
    filePath = '/shop.html';
  } else if (filePath === '/about') {
    filePath = '/about.html';
  } else if (filePath === '/contact') {
    filePath = '/contact.html';
  } else if (filePath === '/post') {
    filePath = '/post.html';
  }

  // Build the full local path
  const fullPath = path.join(__dirname, filePath);

  fs.stat(fullPath, (err, stats) => {
    // If file doesn't exist or is a directory, try adding .html (fallback)
    if (err || !stats.isFile()) {
      const htmlFallbackPath = fullPath + '.html';
      fs.stat(htmlFallbackPath, (fallbackErr, fallbackStats) => {
        if (!fallbackErr && fallbackStats.isFile()) {
          serveFile(htmlFallbackPath, res);
        } else {
          // Serve 404
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        }
      });
    } else {
      serveFile(fullPath, res);
    }
  });
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  fs.createReadStream(filePath).pipe(res);
}

server.listen(PORT, () => {
  console.log(`[Server] running at http://localhost:${PORT}/`);
  console.log(`[Server] Press Ctrl+C to stop`);
});
