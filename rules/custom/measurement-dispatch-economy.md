# Measurement Dispatch Economy — Spend Agents Where They Buy Evidence

<HARD-GATE>
This rule is ON whenever you are about to dispatch subagents to MEASURE
behaviour rather than to do work: the writing-skills TDD loop, baseline
rounds, GREEN rounds, confirming rounds after a reworded rule. It is OFF for
ordinary delegation, where you dispatch to get something built or found.

Three things are non-negotiable while it is on:

1. Gate 0 before any round. Check whether a higher-ranked instruction already
   guarantees the behaviour. If it does, the rule does not get written and the
   round does not get run.
2. Rep counts are asymmetric. Proving a failure EXISTS takes one example.
   Proving it does NOT exist takes a sample. Never spend the sample on the
   first question.
3. A measurement rep never runs as `general-purpose`.
</HARD-GATE>

## Why this rule exists

Measured on 2026-09-02, across ~100 dispatches in one session:

    cost per subagent  ≈  fixed  +  ~800 × tool calls

    fixed, general-purpose (all tools)      ≈ 73,500
    fixed, narrow tool set (Read/Grep/Glob/Bash) ≈ 51,400

Fitted from real dispatch totals; the model predicts observed usage within
~16%. Two consequences follow, and both are counter-intuitive:

- **What an agent DOES is nearly free; that it EXISTS is not.** A rep that
  makes four tool calls cost 76,825. Ninety-six reps spent ~7.1M on startup
  alone. Telling reps to read less or run fewer commands recovers almost
  nothing. Dispatching fewer of them recovers everything.
- **The tool list is most of the fixed cost.** A session with many MCP servers
  connected pays for that list on every dispatch, including reps that only
  read two files.

These numbers are from one machine and one tool configuration. The ordering
they imply — count first, tool set second, everything else a rounding error —
is what transfers, not the constants.

## Gate 0: does this rule already exist somewhere higher?

Before baselining any proposed rule, read the instructions that outrank the
text you are about to write: the user's global protocol, the procedure the
agent will be handed, the sibling agent definition it is modelled on, and the
skill it will load.

If one of them already guarantees the behaviour, **do not write the rule and
do not measure it.** Say which instruction covers it and move on.

Observed in one session, four times: proposed rules for "do not commit
unasked", "do not open a design discussion", "do not weaken a test to make it
pass", and "dispatch one agent per finding" were each already guaranteed —
the first three by the user's standing conventions, the fourth by the
procedure's own "one finding" boundary. All four baselined at 0/3. Nine
dispatches bought what reading two files would have.

Gate 0 is a read, not a round. It costs nothing and it fires most often.

## Rep counts

| Question the round asks | Reps |
|---|---|
| Does this failure happen? | **1.** A reproduction is a reproduction; stop. |
| First rep did NOT reproduce it | +2. "It does not happen" is the claim needing a sample. |
| Does the new wording bind? (GREEN) | 3 |
| GREEN came back ≤1/3 | escalate to 5 — the rate now matters |
| Confirming a reworded line | 2 |

Never open a round at 5. This session's rounds were overwhelmingly 5/5 or
0/5; the fourth and fifth reps carried no information the third had not.

**Do not run a round at all for an interface.** A section name, a field list,
a table's columns — these are decided because a consumer parses them, not
because an agent would otherwise get them wrong. The Iron Law governs
guidance, not contracts.

## Agent type

A measurement rep gets the narrowest agent type that can answer the question.

- Read-only rounds (describe what you would do, verify a claim, judge a
  document) → a read-only agent type. It is ~22k cheaper per dispatch AND
  structurally cannot take the action it is only supposed to describe.
- Rounds that must mutate files → the read-write executor type, not
  `general-purpose`.
- `general-purpose` is for work, not for measurement.

## Prepare the environment before the round, not during it

Every rep pays for whatever the environment lacks, and pays again per rep.

- If reps run tests in a fresh worktree, warm ONE worktree first. Reps that
  each install dependencies spend ~20-25k apiece polling the install.
- If reps run a test command, check the project's test config for defaults
  that inflate output (coverage reporters over the whole tree, for example)
  and pass the flag that turns it off.
- Remove artifacts the round must not see. An unimplemented design doc left in
  the repo will be read, believed, and transcribed — that voided two reps and
  cost two replacements in one session. Untracked files do not exist in a
  fresh worktree, which makes an isolated worktree the cheapest way to get a
  clean measurement surface.

## Rewording measured text is a dispatch, not an edit

Every reworded sentence in a baselined file costs a confirming round. Before
changing one, satisfy yourself that:

- the sentence is what actually failed, and
- the replacement does not open with a condition the agent evaluates about
  ITSELF ("when the choice IS the fix", "if this is significant") — such a
  conditional is an argument the agent can win, and one observed rewrite of
  that shape moved a result from 1/5 to 0/5.

A rewrite that regresses costs two rounds: the failed one and its repair.
Roughly a third of one session's dispatches were re-runs of this kind.

## Forbidden

NEVER:
- Open a baseline at 3 or 5 reps before a single rep has been tried
- Run a round for a rule that a higher-ranked instruction already guarantees
- Dispatch a measurement rep as `general-purpose`
- Let reps discover the environment's gaps one at a time, in parallel
- Treat a reworded sentence as free
- Cut the rounds that matter to pay for the rounds that never should have run
