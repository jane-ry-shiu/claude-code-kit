const mode = process.env.DEMO_MODE || 'ok';
const sine = { command: ['ffmpeg', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'sine=d=1.2', '{out}.aiff'] };
const azure = { engine: 'azure', name: 'zh-TW-HsiaoChenNeural' };

export default {
  name: 'demo-video',
  site: {
    baseUrl: process.env.DEMO_URL,
    cookieSource: mode === 'nosession' ? 'http://127.0.0.1:1' : undefined,
    allowPost: [],
    secretPatterns: [],
  },
  start: '/',
  viewport: '1280x720',
  scale: 1,
  voice: process.env.DEMO_VOICE === 'azure' ? azure : sine,
  scenes: [
    {
      title: '示範',
      sentences: [
        {
          say: '按下刪除按鈕，這個動作會被擋下來。',
          do: {
            throw: async (page) => { await page.click('#does-not-exist', { timeout: 1000 }); },
            slow: async (page) => { await page.waitForTimeout(60000); },
          }[mode] || (async (page, h) => { await h.click('#del'); }),
        },
        { say: '畫面上的 token 會被遮住。' },
      ],
    },
  ],
};
