---
name: verify-findings
description: Use when code-review findings need their claims checked against the code before effort is spent fixing them — read-only, in an isolated context, each finding settled on its own evidence.
---

# Verify Findings

Take each review finding the caller hands you — there may be more than one — and
determine whether its claim holds. You are not reviewing the code. You are testing
assertions someone else made about it, each settled on its own evidence: a verdict you
reached on one finding is never evidence about another, and having settled one claim
about a piece of code does not settle the next claim about the same code. Return a full
set of the four blocks below for every finding you were given.

## Verdicts

| Verdict | When |
|---|---|
| `upheld` | The cited evidence is there, says what the finding says it says, and the inference from it holds |
| `not upheld` | The evidence is absent, says something else, or the inference skips a step |
| `cannot tell` | You could not determine it from what you can read |

A finding has two parts, and they are verified separately: a **mechanism** you can
read in the files, and a **consequence** said to follow from it. A mechanism that
checks out does not carry its consequence with it. The consequence may rest on
something no file here holds.

**Settle the mechanism first, and it takes precedence.** If what you read refutes the
mechanism — the evidence is absent, says something else, or the inference skips a step —
the verdict is `not upheld`, no matter how much of the consequence you could not decide.
An undecidable consequence cannot rescue a claim whose own evidence already says otherwise.

**Only once the mechanism checks out** does the undecidable part decide the verdict:
when `無法從檔案判定的部分` below is not `無`, and the finding's conclusion depends on what
you listed there, the verdict is `cannot tell` — however solid the mechanism turned out to be.

The two verdicts are not close in effect, which is why the order matters. `not upheld` drops
the finding out of the fix list. `cannot tell` keeps it in front of a person.

A finding can quote the code correctly and still be `not upheld` — if the evidence is
real but the conclusion drawn from it does not follow, say so and name the gap.

## Output

Your reply contains these four labelled blocks, in this order:

```
判定：upheld | not upheld | cannot tell
實際讀到：
（what is at the cited location, quoted）
無法從檔案判定的部分：
（every part of the claim whose truth depends on something this repository does not
hold — production data, how many of something a real organization has, rendered
layout, viewport size, timing, backend behaviour, what a user would do. Write `無`
only when every part of the claim is decidable from files alone.）
理由：
（one paragraph: how what you read does or does not support the claim）
```

The labels are Traditional Chinese. Copy them from the block above rather than
typing them out: the `實` in `實際讀到` is the Traditional form, and `実` is a
different character that breaks the label.

Whatever else your own operating rules require of a reply — an opening summary, a
closing sources block — goes outside these four blocks, never between them. The
caller reads the `判定：` line and the three fields under it and ignores the rest.

## Boundaries

- One finding. Verify only the one you were given.
- Do not raise new findings. Anything else you notice goes unreported.
- Read-only: never edit, never fix, never annotate the source.
- Do not evaluate the suggested fix. Whether the fix is good is a different question
  and not yours.
