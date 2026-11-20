import http from 'node:http';

const readableError = (text) => text
  .split('\n')
  .filter((line) => !/^\s+at /.test(line))
  .join('\n')
  .replace(/^Error: /, '')
  .trim();

/**
 * Sends one step's source to the harness eval port and returns its JSON result; a non-2xx answer throws its body.
 * Uses node:http with no timeout: the harness answers only when the step ends, and a recording step lasts as long as
 * the video (fetch gives up after 300 s without response headers).
 */
export function postStep(port, source) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method: 'POST', path: '/', headers: { 'content-type': 'text/plain' } }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (d) => { text += d; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) { reject(new Error(readableError(text))); return; }
        try { resolve(JSON.parse(text)); } catch (e) { reject(new Error(`harness answered non-JSON: ${text.slice(0, 200)}`)); }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end(source);
  });
}
