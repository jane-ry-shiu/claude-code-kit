import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { postStep } from '../lib/harness-client.mjs';

const serve = (handler) => new Promise((resolve) => {
  const server = http.createServer(handler);
  server.listen(0, '127.0.0.1', () => resolve(server));
});

test('postStep returns the step result', async () => {
  const server = await serve((req, res) => { let b = ''; req.on('data', (d) => { b += d; }); req.on('end', () => res.end(JSON.stringify({ got: b }))); });
  try { assert.deepEqual(await postStep(server.address().port, 'async () => 1'), { got: 'async () => 1' }); } finally { server.close(); }
});

test('postStep throws the harness error text', async () => {
  const server = await serve((req, res) => { req.resume(); req.on('end', () => { res.statusCode = 500; res.end('Error: boom'); }); });
  try { await assert.rejects(postStep(server.address().port, 'x'), /Error: boom/); } finally { server.close(); }
});

test('postStep drops stack frames from the harness error but keeps the call log', async () => {
  const body = "Error: scene 1 sentence 0: locator.boundingBox: Timeout 30000ms exceeded.\nCall log:\n  - waiting for locator('main h2')\n\n    at eval (eval at <anonymous> (file:///h.mjs:227:16), <anonymous>:167:62)\n    at async Server.<anonymous> (file:///h.mjs:228:29)";
  const server = await serve((req, res) => { req.resume(); req.on('end', () => { res.statusCode = 500; res.end(body); }); });
  try {
    await assert.rejects(postStep(server.address().port, 'x'), (e) => {
      assert.match(e.message, /^scene 1 sentence 0: locator.boundingBox: Timeout 30000ms exceeded\.\nCall log:\n  - waiting for locator\('main h2'\)$/);
      return true;
    });
  } finally { server.close(); }
});

const long = !process.env.LONG_TESTS && 'set LONG_TESTS=1 to run (takes over 5 minutes)';
test('postStep waits for a step that runs longer than 5 minutes', { skip: long, timeout: 400000 }, async () => {
  const server = await serve((req, res) => { req.resume(); setTimeout(() => res.end('{"ok":true}'), 305000); });
  server.headersTimeout = 0; server.requestTimeout = 0; server.keepAliveTimeout = 0;
  try { assert.deepEqual(await postStep(server.address().port, 'x'), { ok: true }); } finally { server.close(); }
});
