# Vocabulary — Names the Reader Can Map

<HARD-GATE>
Applies to every piece of text written for a person to read:

- conversational replies
- Jira tickets and comments (summary, description, comment)
- Confluence pages, PR descriptions, PR review comments

The reader maps words to pages and concepts they already know. A translated or
undefined name breaks that mapping, and everything written after it is misread.
</HARD-GATE>

## Rule 1: Keep names in their original form

A translated name breaks the mapping even when the translation is accurate.

    Product names    pages, features, objects the user sees — write them as the
                     project's default i18n / English UI text shows them.
                     Message center, not 訊息中心. Floor plan, not 平面圖.
                     Unsure of the English text → look it up in the English
                     locale before writing it; do not invent one.
    Technical terms  cache, re-render, race condition, debounce, virtual scroll —
                     keep them in English, do not render them as 快取 / 重新渲染.
    Ticket keys      always the full key (ADAT-1180, not 1180).

Sentences stay in 繁體中文; only the nouns keep their original form.

A product name is what the user sees on screen; a field, function, or file name
is what the code calls it. This rule allows the first. Whether the second may
appear is decided elsewhere: in a conversational reply `response-granularity.md`
bans it; in a ticket or document, that artifact's own format decides.

## Rule 2: Align key terms before they are used

The first time a project-specific term appears — a product name, a domain
object, a feature-specific concept, a test fixture — define it at the top,
before anything uses it. Do this even when the term looks obvious; the cost of
one extra line is lower than the reader misreading everything after it.

    原文 — 一句它是什麼、拿來做什麼。下面簡稱 <短稱>。

    camera marker — floor plan 上代表一台裝置的記號，讓使用者知道裝置在哪個
    位置。下面簡稱 marker。

"First time" depends on how the text is read:

    Conversational reply   first use in the session. A term already defined
                           earlier in this session is not defined again.
    Ticket, comment, page  first use in THAT artifact. Each one is read on its
                           own, by people who never saw this session — define
                           every term it relies on, even if the session already
                           did. In a Jira description, put the block where the
                           description template allows; in a comment, at the top.

Text that introduces no project-specific term gets no definition block. Once
defined, use the same short name throughout — never switch between 標記 /
marker / 圖示 for one thing.

A short name must still say WHICH thing. Drop words, never the part that tells
this thing apart from others of its kind: keep the identifying part plus the
generic noun, using the team's own abbreviation where one exists. A definition
line does not rescue a bare generic noun — by the fifth use the reader has
forgotten it and reads "any dialog".

    Manage Device Access dialog  ->  MDA 對話框   ok
                                 ->  對話框       no — every dialog is one

Test: could the short name point to anything else on the same page or in the
same text? If yes, it is too short.

A definition that involves another term names that term exactly. "Floor plan —
用來擺放 camera marker" says what sits on it; "裝置可以擺在上面" does not, because
what sits on a floor plan is the marker, not the device.

Not defined, because the reader already knows them:

    Everyday words          頁面, 按鈕, 勾選
    General technical terms cache, ancestor / sibling / descendant, re-render —
                            anything with the same meaning outside this project
    Ticket keys             the full key is the identifier; no definition
