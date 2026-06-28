const fs = require('fs');
const path = require('path');
const jsYaml = require('js-yaml');
const { marked } = require('marked');

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true
});

const POSTS_DIR = path.join(__dirname, 'content', 'posts');
const SHOP_DIR = path.join(__dirname, 'content', 'shop');
const OUTPUT_DIR = path.join(__dirname, 'api');

// Helper to parse Markdown to HTML
function parseMarkdown(md) {
  if (!md) return '';
  const cleanedMd = md.replace(/\\\\#/g, '#').replace(/\\#/g, '#');
  let html = marked.parse(cleanedMd);

  html = html.replace(
    /<p>\s*(<img[^>]+>)\s*<\/p>/gi,
    (_, imgTag) => wrapImageInFigure(imgTag)
  );

  return html;
}

function wrapImageInFigure(imgTag) {
  const titleMatch = imgTag.match(/title="([^"]*)"/i);
  const caption = titleMatch && titleMatch[1].trim();

  if (caption) {
    return `<figure class="post-figure">${imgTag}<figcaption>${caption}</figcaption></figure>`;
  }
  return `<figure class="post-figure">${imgTag}</figure>`;
}

// Function to read and parse a markdown post file
function getPostData(fileName) {
  const filePath = path.join(POSTS_DIR, fileName);
  try {
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
        body: parsedBody,
        rawBody: markdownBody,
        filename: fileName,
        slug: metadata.slug || path.basename(fileName, '.md')
      };
    } else {
      const slug = path.basename(fileName, '.md');
      return {
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

console.log('[Build] Starting static API compilation...');

// Ensure output folder exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 1. Process posts
let posts = [];
if (fs.existsSync(POSTS_DIR)) {
  const files = fs.readdirSync(POSTS_DIR);
  const mdFiles = files.filter(f => f.endsWith('.md'));
  posts = mdFiles
    .map(file => getPostData(file))
    .filter(post => post !== null && post.published !== false);

  posts.sort((a, b) => {
    const dateA = a.date ? new Date(a.date) : new Date(0);
    const dateB = b.date ? new Date(b.date) : new Date(0);
    return dateB - dateA;
  });
}
fs.writeFileSync(path.join(OUTPUT_DIR, 'posts.json'), JSON.stringify(posts, null, 2), 'utf8');
console.log(`[Build] Compiled ${posts.length} posts to api/posts.json`);

// 2. Process shop items
let shopItems = [];
if (fs.existsSync(SHOP_DIR)) {
  const files = fs.readdirSync(SHOP_DIR);
  const mdFiles = files.filter(f => f.endsWith('.md'));
  shopItems = mdFiles
    .map(file => getShopItemData(file))
    .filter(item => item !== null && item.published !== false);

  shopItems.sort((a, b) => {
    const dateA = a.date ? new Date(a.date) : new Date(0);
    const dateB = b.date ? new Date(b.date) : new Date(0);
    return dateB - dateA;
  });
}
fs.writeFileSync(path.join(OUTPUT_DIR, 'shop.json'), JSON.stringify(shopItems, null, 2), 'utf8');
console.log(`[Build] Compiled ${shopItems.length} shop items to api/shop.json`);

console.log('[Build] Static API compilation complete!');
