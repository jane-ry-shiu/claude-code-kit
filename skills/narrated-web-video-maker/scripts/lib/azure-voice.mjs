import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SWITCH_HINT = 'To voice this video with Meijia instead, rerun with --voice mac.';
/** Waits before each retry of a 429 without Retry-After; together they outlast the free tier's 60 s window. */
const BACKOFF_MS = [5000, 15000, 30000, 60000];
const MAX_RETRIES = BACKOFF_MS.length;
const MAX_RETRY_MS = 60000;
const REQUEST_TIMEOUT_MS = 60000;

const fail = (message) => new Error(`${message}\n${SWITCH_HINT}`);

const xmlEscape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** The locale part of an Azure voice short name: zh-TW-HsiaoChenNeural -> zh-TW. */
export const voiceLocale = (name) => name.split('-').slice(0, 2).join('-');

/** SSML that speaks `text` with the Azure voice `{ name, rate? }`. */
export function azureSsml(text, { name, rate }) {
  const body = rate ? `<prosody rate='${xmlEscape(rate)}'>${xmlEscape(text)}</prosody>` : xmlEscape(text);
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${voiceLocale(name)}'>`
    + `<voice name='${xmlEscape(name)}'>${body}</voice></speak>`;
}

function kitSecretPath() {
  const here = dirname(realpathSync(fileURLToPath(import.meta.url)));
  const inKit = join(here, '..', '..', '..', '..', 'bin', 'kit-secret');
  return existsSync(inKit) ? inKit : 'kit-secret';
}

/** Reads one claude-code-kit secret (Keychain service claude-code-kit); null when it is not stored or there is no kit. */
export function readKitSecret(name) {
  try {
    return execFileSync(kitSecretPath(), ['get', name], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null;
  } catch {
    return null;
  }
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

function checkedEndpoint(endpoint) {
  let url;
  try { url = new URL(endpoint); } catch { url = null; }
  if (url && (url.protocol === 'https:' || (url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname)))) return endpoint;
  throw fail(`AZURE_SPEECH_ENDPOINT must be an https URL (the key travels in a header); got "${endpoint}".`);
}

/** Key, region and endpoint for Azure Speech: the environment first, then the stored kit secrets. */
export function azureCredentials(env = process.env, readSecret = readKitSecret) {
  const value = (name) => (env[name] || readSecret(name) || '').trim();
  const key = value('AZURE_SPEECH_KEY');
  const region = value('AZURE_SPEECH_REGION');
  const missing = [['AZURE_SPEECH_KEY', key], ['AZURE_SPEECH_REGION', region]].filter(([, v]) => !v).map(([n]) => n);
  if (missing.length) {
    throw fail(`no Azure Speech ${missing.join(' / ')}: store them with \`kit-secret set ${missing.join('` and `kit-secret set ')}\``
      + ' (claude-code-kit/bin), or export them in your shell.');
  }
  if (!/^[a-z0-9]+$/.test(region)) {
    throw fail(`AZURE_SPEECH_REGION "${region}" is not a region name: use the lower-case value shown under Keys and Endpoint, e.g. eastasia.`);
  }
  const endpoint = env.AZURE_SPEECH_ENDPOINT
    ? checkedEndpoint(env.AZURE_SPEECH_ENDPOINT.trim())
    : `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  return { key, region, endpoint };
}

const retryDelay = (res, attempt) => {
  const seconds = Number(res.headers.get('retry-after'));
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, MAX_RETRY_MS) : BACKOFF_MS[attempt];
};

async function statusError(res, text, voice) {
  const detail = (await res.text().catch(() => '')).trim().slice(0, 200);
  const said = detail ? ` Azure said: ${detail}` : '';
  if (res.status === 401 || res.status === 403) {
    return fail(`Azure rejected the key or region (HTTP ${res.status}): check that AZURE_SPEECH_KEY and AZURE_SPEECH_REGION belong to the same Speech resource.${said}`);
  }
  if (res.status === 429) {
    return fail(`Azure quota or rate limit reached (HTTP 429) after ${MAX_RETRIES} retries: the free tier allows 20 requests a minute`
      + ' and a monthly character allowance. Rerun into the same out dir to continue from the cached sentences once the minute'
      + ` has passed; if it fails again, the monthly allowance is used up.${said}`);
  }
  if (res.status === 400) {
    return fail(`Azure rejected the request (HTTP 400): check the voice name "${voice.name}" exists in this region, and the text "${text}".${said}`);
  }
  return fail(`Azure text to speech failed with HTTP ${res.status}.${said}`);
}

/** Voices `text` with the Azure voice `{ name, rate? }`; resolves to the RIFF wav bytes. */
export async function azureSynthesize(text, voice, creds, { sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const init = {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': creds.key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'riff-48khz-16bit-mono-pcm',
      'User-Agent': 'narrated-web-video-maker',
    },
    body: azureSsml(text, voice),
  };
  for (let attempt = 0; ; attempt += 1) {
    let res;
    try {
      res = await fetch(creds.endpoint, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (e) {
      throw fail(`could not reach Azure at ${new URL(creds.endpoint).host}: ${e.cause?.code || e.cause?.message || e.message}`);
    }
    if (res.ok) {
      try {
        return Buffer.from(await res.arrayBuffer());
      } catch (e) {
        throw fail(`the audio download from Azure was cut off for "${text}": ${e.cause?.code || e.cause?.message || e.message}`);
      }
    }
    if (res.status === 429 && attempt < MAX_RETRIES) {
      await res.body?.cancel();
      await sleep(retryDelay(res, attempt));
      continue;
    }
    throw await statusError(res, text, voice);
  }
}
