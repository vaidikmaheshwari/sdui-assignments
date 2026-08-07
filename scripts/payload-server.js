#!/usr/bin/env node
/**
 * P7 payload server (docs/PROMPTS.md P7).
 *
 * Before P7 this project had no network path at all: `App.tsx` imported `payloads/home.json`
 * as a Metro-bundled module, so there was no runtime `JSON.parse` and nothing for a cache to
 * be "first" against. P7 items 1, 4 and 6 are unmeasurable without a wire, so this serves one.
 *
 * Reached from the device over USB via `adb reverse tcp:8787 tcp:8787`, i.e. localhost from
 * the app's point of view. localhost-over-USB is ~1ms, which would make cache-first look like
 * a rounding error and understate it badly, so every response is delayed by a *fixed*
 * SDUI_LATENCY_MS (default 300) to model a real mobile network. That number is a knob I chose,
 * not a measurement — the benchmark reports the raw wire delta separately so it can be
 * subtracted back out.
 *
 * Routes:
 *   GET /home.json     — payloads/home.json, application/json
 *   GET /home.msgpack  — the same object MessagePack-encoded (P7 item 6)
 *   GET /health        — no latency, used by the benchmark script to confirm adb reverse works
 *
 * Usage: node scripts/payload-server.js [port]
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { encode } = require('@msgpack/msgpack');

const PORT = Number(process.argv[2] || process.env.SDUI_PORT || 8787);
const LATENCY_MS = Number(process.env.SDUI_LATENCY_MS ?? 300);

const payloadPath = path.join(__dirname, '..', 'payloads', 'home.json');
const payloadObject = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

// Minified, not the pretty-printed bytes on disk. payloads/home.json is indented for humans;
// serving that verbatim would hand item 6 a rigged win by padding JSON with ~30% whitespace
// that no real server would send.
const jsonBuffer = Buffer.from(JSON.stringify(payloadObject), 'utf8');

// Encode once at boot: the point of the comparison is decode cost on the device, not encode
// cost on the server, and leaving encoding in the request path would add server-side noise to
// the msgpack variant that the JSON variant doesn't pay.
const msgpackBuffer = Buffer.from(encode(payloadObject));

function send(res, status, contentType, body) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': body.length,
    // No caching: every cold start must actually cross the wire, otherwise the "before" for
    // cache-first is silently already cache-first.
    'Cache-Control': 'no-store',
    Connection: 'close',
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = (req.url || '').split('?')[0];

  if (url === '/health') {
    send(res, 200, 'text/plain', Buffer.from('ok'));
    return;
  }

  let body;
  let contentType;
  if (url === '/home.json') {
    body = jsonBuffer;
    contentType = 'application/json';
  } else if (url === '/home.msgpack') {
    body = msgpackBuffer;
    contentType = 'application/vnd.msgpack';
  } else {
    send(res, 404, 'text/plain', Buffer.from('not found'));
    return;
  }

  setTimeout(() => send(res, 200, contentType, body), LATENCY_MS);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`payload-server listening on 127.0.0.1:${PORT}`);
  console.log(`  latency: ${LATENCY_MS}ms (SDUI_LATENCY_MS)`);
  // gzip sizes are logged but not served: real transports compress, and item 6's "fewer bytes"
  // claim shrinks a lot once they do. Recorded so the write-up can say so with a number.
  const gzip = (buf) => zlib.gzipSync(buf, { level: 9 }).length;
  console.log(`  /home.json     ${jsonBuffer.length} bytes (gzip ${gzip(jsonBuffer)})`);
  console.log(`  /home.msgpack  ${msgpackBuffer.length} bytes (gzip ${gzip(msgpackBuffer)})`);
});
