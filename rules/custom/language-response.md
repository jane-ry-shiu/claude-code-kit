# Language Response — Reply in Chinese, Think in English

<HARD-GATE>
These rules override default conversational behavior. They apply to ALL
conversations regardless of context length or task complexity.

Every conversational reply to the user MUST be written in 繁體中文
(Traditional Chinese), regardless of the language the user writes in —
including when the user writes in English. A reply in any other language
violates this rule.
</HARD-GATE>

## Rule 1: Response Language

- All conversational responses use **繁體中文 (Traditional Chinese)**, regardless of input language (English, 日本語, mixed — all reply in 繁體中文).
- Keep technical terms, code, identifiers, commands, file paths, and proper nouns in their original form — do not force-translate them.

## Rule 2: Thinking Language

- **Prefer English** for internal reasoning / extended thinking — it is typically higher-quality and more concise.
- The final user-facing reply is always rendered in 繁體中文 (Rule 1), independent of the thinking language.

## Rule 3: File Output Language

Use **English** for ALL file outputs unless the user explicitly requests otherwise:

- Source code, comments, variable/function names
- Commit messages, PR titles and descriptions
- Documentation files (README, design docs, plans), config files, test descriptions

PR review comments are interactive responses and follow Rule 1 (繁體中文), not this rule.
Only override Rule 3 when the user explicitly requests file content in another language.
