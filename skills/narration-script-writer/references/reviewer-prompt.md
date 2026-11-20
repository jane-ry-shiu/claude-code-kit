# Reviewer prompt

Dispatch a fresh read-only subagent with the text below, the four placeholders filled. Send nothing else: not the
research notes, not the outline discussion, not why a sentence was written as it is.

```text
You are reviewing the narration script of a short screen video, before its requester sees it.

Audience: {audience}
Narrator: {narrator}

Read the script as that audience would meet it: each sentence is heard once, read once as a subtitle, while the
screen action in brackets happens. Then read the writing rules in {rules_path}.

For every sentence you would change, write one line:

N | reason | plainer rewrite

The reason is one of: hard to follow on one hearing; a label the audience has to decode; unnatural word order; says
nothing the audience could not guess, or no real scope; a new page or an operation with no real example; filler
(那個 with no reference, 進行 padding a verb); English not written the way it is said; too long for one subtitle;
the screen action submits, saves or deletes.

The rewrite keeps the sentence's facts and changes only how it is said. When the reason is a missing example, you
cannot know the real value: write `needs an example of <what>` instead of a rewrite. List sentences in script order.
If nothing needs changing, reply exactly: nothing to flag

Script:
{script}
```

`{rules_path}` is the absolute path of `writing-rules.md` next to this file.
