# Writing rules

A sentence is one thing said in everyday spoken Traditional Chinese, true of the page on screen, and short enough for
one subtitle (two lines of at most 28 characters; the checker measures it the way the recorder splits it). Spoken does
not mean padded: the subtitle shows every word.

The examples come from a script about Backstage, a public developer portal; the "before" column is a real draft its
requester marked.

## How each sentence is written

| Rule | Before | After |
|---|---|---|
| Name a thing by what it is and what the viewer does with it. A label the viewer has to decode (portal, endpoint, node, domain) is replaced or explained once. | 這支影片帶你認識 Backstage，公司內部的開發者入口。 | 這支影片介紹 Backstage。它是公司內部的一個網站，專門用來查各個服務的資料。 |
| Start with the thing on screen or being talked about, then say what it is. | 首頁就是 Catalog。 | Catalog 是 Backstage 的首頁。 |
| Every sentence tells the viewer something they could not guess. Give the real scope instead of a bare 所有 or 相關. | 點左邊的 APIs，可以瀏覽所有 API。 | 點左邊的 APIs，可以瀏覽所有已經登記在 Backstage 上的 API。 |
| A page the viewer has not used before gets what it is for, who reads or uses it, and what is in it, each with a real example from the screen. | Docs 收錄各個服務的技術文件，文件跟程式碼放在一起，所以會跟著程式碼一起更新。 | Docs 是放技術文件的地方，每份文件都屬於一個服務。／文件是寫給要修改或串接這個服務的人看，例如前端要串接後端的 API 之前，可以先來這裡看。／清單列出已經寫好文件的服務，例如 Shipping Backend 和 Billing Portal。／這份文件說明這個服務在做什麼，還有怎麼在自己的電腦上跑起來。 |
| An operation that takes a choice or an input names one real value the viewer sees happen. | 左邊的 Kind 用來切換要看哪一類，預設的 Component，指的是服務、網站和共用套件。 | 左邊的 Kind 用來切換要看哪一類，例如選 API，清單就只剩下 API。／預設的 Component，指的是服務、網站和共用套件。 |
| Put the real verb in front; 進行 in front of a verb adds words and no meaning. (進行 meaning "in progress" is fine: 進行中.) | 點 Save 進行儲存。 | 點 Save 儲存。 |
| No filler. 嗯, 痾, 呃 never belong (the checker flags them); 那個 is filler only when it carries no reference. | 那個，我們來看一下這頁。 | 這一頁是服務的詳細資料。 |
| Say what a technical detail means to the viewer. | 每個 endpoint 都可以展開，看請求和回應的格式。 | 每一支 API 都能展開，看要送什麼資料、會拿回什麼。 |
| English the way it is said: split into words, with capitals. The checker flags `a-b`, `a.b`, `a/b` and all-caps words of five or more letters; a word that is right as written (HTTPS, a name in capitals on screen) goes on the script's `keep:` line. | 打開 openapi 資料夾的 README。 | 打開 Open API 資料夾的 Read Me。 |
| UI labels exactly as on screen (spelling and case). | 點 filter。 | 點 Filter。 |
| One idea per sentence; a sentence that would need two subtitles becomes two sentences. | 接下來還有兩支影片，分別給後端和前端，說明怎麼更新自己服務的資料，以及 Backstage 能怎麼幫你開發。 | 接下來還有兩支影片，分別給後端和前端的同事。／影片會說明怎麼更新自己服務的資料，以及 Backstage 能怎麼幫你開發。 |

## Screen actions

- In brackets at the end of the sentence, said while that sentence is spoken: 「（點側邊欄 APIs）」, 「（平順往下捲到 Provided APIs）」.
- Only actions that read. A step that submits, saves or deletes stops before the click:
  `12. 改完之後按下送出就可以了，這裡只是示範，所以不會真的送出。（指標停在送出按鈕上，不點）`
- A sentence with nothing to do on screen has no brackets.

## Length

About 6 s per sentence: a 1-minute video is about 10 sentences. The video maker adds the pauses between sentences
and scenes; the script adds none.
