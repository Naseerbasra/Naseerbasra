const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data', 'messages.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

async function readMessages() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
      await fs.writeFile(DATA_FILE, '[]');
      return [];
    }
    throw error;
  }
}

async function writeMessages(messages) {
  await fs.writeFile(DATA_FILE, JSON.stringify(messages, null, 2));
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) {
    return {};
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw);
}

function sanitizeText(value) {
  return String(value || '').trim();
}

async function handleApi(req, res) {
  if (req.url === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, { status: 'ok', service: 'naseerbasra-fullstack-site' });
  }

  if (req.url === '/api/messages' && req.method === 'GET') {
    const messages = await readMessages();
    return sendJson(res, 200, messages);
  }

  if (req.url === '/api/messages' && req.method === 'POST') {
    const body = await parseBody(req);
    const name = sanitizeText(body.name);
    const email = sanitizeText(body.email);
    const message = sanitizeText(body.message);

    if (!name || !email || !message) {
      return sendJson(res, 400, { error: 'name, email, and message are required.' });
    }

    const messages = await readMessages();
    const newMessage = {
      id: randomUUID(),
      name,
      email,
      message,
      createdAt: new Date().toISOString()
    };

    messages.unshift(newMessage);
    await writeMessages(messages);
    return sendJson(res, 201, newMessage);
  }

  return sendJson(res, 404, { error: 'API route not found.' });
}

async function serveStatic(req, res) {
  const requestPath = req.url === '/' ? '/index.html' : req.url;
  const normalizedPath = path.normalize(requestPath).replace(/^\.{2,}(\/|\\|$)/, '');
  const filePath = path.join(PUBLIC_DIR, normalizedPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  try {
    const fileContent = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    return res.end(fileContent);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not Found');
    }

    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) {
      return sendJson(res, 400, { error: 'Bad request.' });
    }

    if (req.url.startsWith('/api/')) {
      return await handleApi(req, res);
    }

    return await serveStatic(req, res);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: 'Something went wrong on the server.' });
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
