// Builders for the step scripts sent to the os-screen-capture harness. A step is evaluated inside the harness, so it
// can only use what is in its own text plus the harness scope (`chromium`, `page`, `context`, `h`).
import { isAllowedRequest } from './guard.mjs';
import { maskInitScript, scanSecrets } from './secrets.mjs';

/**
 * Step that signs the headless browser in (cookies from the shared Chrome), guards writes and installs masking.
 * Writes are guarded per page through the browser's own interception, limited to the guarded hosts: a Playwright
 * route would pause every request and turn the HTTP cache off, which made signed-in GitHub pages load in 7-9 s.
 */
export function setupStepSource(site) {
  const base = new URL(site.baseUrl);
  const signIns = [
    { host: site.cookieHost || base.hostname, url: site.baseUrl },
    ...(site.alsoSignIn || []).map((url) => ({ host: new URL(url).hostname, url })),
  ];
  const guardHosts = [base.host, ...(site.alsoSignIn || []).map((url) => new URL(url).host), ...(site.guardHosts || [])];
  return `async (page, context, h) => {
  const site = ${JSON.stringify({ ...site, signIns, guardHosts })};
  const allowed = ${isAllowedRequest.toString()};
  let n = 0;
  if (site.cookieSource) {
    const need = (s) => 'no session for ' + s.host + ': sign in to ' + s.url + ' in the shared Chrome';
    let all;
    try {
      const shared = await chromium.connectOverCDP(site.cookieSource);
      all = await shared.contexts()[0].cookies();
    } catch (e) { throw new Error(need(site.signIns[0]) + ' (' + e.message + ')'); }
    for (const s of site.signIns) {
      const mine = all.filter((c) => { const d = c.domain.replace(/^\\./, ''); return s.host === d || s.host.endsWith('.' + d); });
      if (!mine.length) throw new Error(need(s));
      await context.addCookies(mine);
      n += mine.length;
    }
  }
  h.state.guardLog = [];
  const patterns = site.guardHosts.flatMap((g) => [{ urlPattern: 'http://' + g + '/*' }, { urlPattern: 'https://' + g + '/*' }]);
  const guard = async (p) => {
    const cdp = await context.newCDPSession(p);
    cdp.on('Fetch.requestPaused', async (e) => {
      const path = new URL(e.request.url).pathname;
      if (allowed(e.request.method, path, site.allowPost || [])) return cdp.send('Fetch.continueRequest', { requestId: e.requestId }).catch(() => null);
      h.state.guardLog.push(e.request.method + ' ' + path);
      return cdp.send('Fetch.failRequest', { requestId: e.requestId, errorReason: 'BlockedByClient' }).catch(() => null);
    });
    await cdp.send('Fetch.enable', { patterns });
  };
  for (const p of context.pages()) await guard(p);
  context.on('page', (p) => { guard(p).catch(() => null); });
  await context.addInitScript(${JSON.stringify(maskInitScript(site.secretPatterns || []))});
  return { cookies: n, guardHosts: site.guardHosts };
}`;
}

// Some signed-in sites (GitHub) keep one request open forever, so the start page may never go quiet.
export const START_QUIET_MS = 10000;

/**
 * Step that records the whole video: one mark per cue, the sentence's action on its first cue, a hold until the
 * cue's time is up, and a secret scan of the page at each scene end. The recording is always stopped.
 */
export function recordStepSource(plan) {
  const cues = plan.cues.map(({ action, ...c }, i, all) => ({ ...c, sceneEnd: i === all.length - 1 || all[i + 1].scene !== c.scene }));
  const actions = plan.cues.map((c) => (c.action ? `(${c.action})` : 'null'));
  return `async (page, context, h) => {
  const plan = ${JSON.stringify({ name: plan.name, url: plan.baseUrl + (plan.start || '/'), secretPatterns: plan.secretPatterns || [], cues })};
  const actions = [${actions.join(',\n')}];
  const scan = ${scanSecrets.toString()};
  await page.goto(plan.url, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: ${START_QUIET_MS} }).catch(() => null);
  await h.sleep(1500);
  await h.recStart(plan.name);
  const secretHits = [];
  let failure = null, rec = null;
  try {
    for (let i = 0; i < plan.cues.length; i += 1) {
      const c = plan.cues[i];
      h.mark(c.text);
      const t0 = Date.now();
      if (actions[i]) {
        try { await actions[i](page, h); } catch (e) { throw new Error('scene ' + c.scene + ' sentence ' + c.sentence + ': ' + e.message); }
      }
      const left = c.hold * 1000 - (Date.now() - t0);
      if (left > 0) await h.sleep(left);
      if (c.sceneEnd) secretHits.push({ scene: c.scene, hits: scan(await page.evaluate(() => document.body.innerText), plan.secretPatterns, 'find') });
    }
  } catch (e) { failure = e; }
  try { rec = await h.recStop(); } catch (e) {
    if (!failure) throw e;
    throw new Error(failure.message + ' (stopping the recording also failed: ' + e.message + ')');
  }
  if (failure) throw failure;
  return { rec, guardLog: h.state.guardLog || [], secretHits };
}`;
}
