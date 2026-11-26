# Scene file

An ES module whose default export describes one video. `make-video.mjs` checks it and lists every problem at once.

| Field | Required | Meaning |
|---|---|---|
| `name` | yes | lower-case-with-dashes; the mp4 is `<name>.mp4` |
| `site.baseUrl` | yes | origin of the site, e.g. `https://portal.example.com` |
| `site.cookieSource` | no | CDP URL of the signed-in shared Chrome (`http://127.0.0.1:9222`); leave out for public sites |
| `site.cookieHost` | no | host whose sign-in cookies are copied (cookies set on it or on a parent domain, e.g. `.example.com`); default: host name of `baseUrl` |
| `site.alsoSignIn` | no | other sites the video opens that need sign-in, as origins (`['https://github.com']`); their cookies are copied from the shared Chrome too and their writes are blocked like the main site's |
| `site.guardHosts` | no | extra hosts (`host` or `host:port`) whose writes are blocked, e.g. an API on another host; the host of `baseUrl` is always guarded |
| `site.allowPost` | no | regex sources of POST paths that only read (search, batch lookups); every other non-GET is blocked |
| `site.secretPatterns` | no | extra regex sources to mask |
| `start` | no | path opened before recording starts (default `/`) |
| `viewport`, `scale` | no | default `1600x900`, `1.2` (a 1920×1080 video) |
| `voice` | no | `{ engine: 'azure', name: 'zh-TW-HsiaoChenNeural', rate?: '+10%' }` (needs a key, see SKILL.md), or `{ command: [...] }` with `{text}` and `{out}` placeholders; default `say -v Meijia -r 200 -o {out}.aiff {text}`. `--voice mac` on the command line overrides it |
| `scenes[].title` | yes | for your own reading; not shown |
| `scenes[].sentences[].say` | yes | what is spoken and shown as subtitle(s) |
| `scenes[].sentences[].do` | no | `async (page, h) => { … }` run while the sentence's first cue is spoken |

`do` is sent to the recorder as source text, so it cannot use variables from the scene file, and it never calls
`h.mark` (the subtitle is the sentence's `say`; the file is rejected if it does). Inside it use:

- `h.click(target, { fx, fy })` — target is a CSS selector, a Playwright locator (`page.getByRole('link', { name: 'APIs' })`)
  or a point `{ x, y }`; the pointer glides there and clicks.
- `h.glide(x, y)` — move the pointer without clicking (point at something while it is described). To point at an
  element: `const b = await locator.boundingBox({ timeout: 5000 }).catch(() => null); if (b) await h.glide(...)` — a
  missing pointing target then skips the gesture instead of failing the whole video after 30 s.
- `page.keyboard.press('Escape')` — press a key. (`h.key` also draws a 「按鍵：…」 label on the video, which is not
  narration; use it only when the key itself is the lesson.)
- `page.keyboard.type('shipping', { delay: 150 })` — type visibly.
- `page.evaluate(() => window.scrollTo({ top: 800, behavior: 'smooth' }))` — scroll.
- `page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => null)` after a click that navigates. The short
  timeout matters: some signed-in sites (GitHub) never go quiet, and the next subtitle waits for the action to end.

## Example

```js
export default {
  name: 'backstage-catalog-intro',
  site: {
    baseUrl: 'https://portal.example.com',
    cookieSource: 'http://127.0.0.1:9222',
    allowPost: ['^/api/catalog/entities/(by-refs|by-query)', '^/api/catalog/entity-facets', '^/api/search'],
  },
  scenes: [
    {
      title: 'Catalog',
      sentences: [
        { say: 'Backstage 的首頁就是 Catalog，公司的服務、API 和基礎設施，都登記在這裡。',
          do: async (page, h) => { await h.glide(82, 174); } },
        { say: '左邊的 Kind 可以切換要看的種類，這裡改成 API。',
          do: async (page, h) => {
            await h.click(page.locator('[aria-haspopup="listbox"]').first());
            await h.click(page.getByRole('option', { name: 'API', exact: true }));
          } },
      ],
    },
  ],
};
```
