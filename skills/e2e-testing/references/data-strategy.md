# Data Strategy

How to set up and tear down the data an e2e test needs. Get this wrong and tests are either
slow/flaky (seeded through the UI) or fast but meaningless (asserting against the API instead
of the screen). Used by authoring (deciding how to provision a new scenario) and by review
(flagging specs that create data the wrong way).

## Baseline vs dynamic

Every object a test touches is either **baseline** (already there) or **dynamic** (created for
this test). Decide with one question:

```
Does this object represent something that would already exist for
realistic use of the feature (an account, workspace, role, license,
a pre-configured integration, a permission grant)?
   |
   |-- yes --> BASELINE
   |             pre-provisioned in fixtures, out-of-band.
   |             The test does NOT create it, and must NOT delete it.
   |
   `-- no  --> DYNAMIC
                 created at runtime in Arrange.
                 Torn down / restored after the test (see below).
```

Red flag: a "baseline" object that two tests running in parallel would fight over (both edit
it, one deletes it). Either make it read-only-safe (true baseline) or make it per-test unique
(dynamic, namespaced/random) — never leave it shared-and-mutable.

## Seed via API, not UI

- **Business objects** (users, projects, groups, configs, records) → create/update/delete
  through the project's own API layer (REST or GraphQL) — the same layer the app's frontend
  calls, or a dedicated test client wrapping it. Never seed by clicking through the UI: that
  makes every test's Arrange phase an untested UI flow of its own, couples unrelated tests to
  unrelated bugs, and is far slower than a direct call.
- **Backend/infra state with no user-facing API** (feature flags, direct rows, queued
  messages) → seed through whatever DB or cloud/service utility the project already uses for
  migrations/scripts.
- **Real-hardware events** → see below; they need a different mechanism entirely.
- Every creation is paired with a teardown that restores prior state — seeding without a
  matching restore is how baseline data quietly rots.

## Real-hardware events

Some preconditions can't be produced by an ordinary API call because they originate from
physical hardware or a third-party push (an external device coming online, a physical sensor
firing, a third-party webhook event). Prefer, in order:

1. **A device/hardware emulator** driven programmatically to emit the same signal a real
   device would — e.g. a device emulator that fires a synthetic device-online webhook.
2. **A mock event trigger / test-only endpoint** that injects the event straight into the
   backend, bypassing the physical device — e.g. a mock trigger that posts a synthetic
   sensor-event payload.
3. **A real device in a controlled test bed**, only if neither above exists — treat this as a
   last resort and flag it as such; it is slow, flaky, and shared across whoever else is using
   the rig.

Whichever is used, the test still asserts on the UI's reaction to the event — not on the
emulator's or mock's internal state.

## Teardown & restore

The teardown *rule* lives in [bdd-standard.md#4-teardown](bdd-standard.md#4-teardown); this
section adds the *strategy*.

- **Delete vs. revert**: if the test *created* the object, delete it — there's no prior state
  to revert to. If the test *modified* a pre-existing object, revert it to its prior values —
  deleting it would destroy someone else's baseline.
- Teardown must run even when the test fails (`afterEach`/`finally`/equivalent). A step that
  only tears down on success turns every failure into a leaked object and tomorrow's flaky
  "baseline."

## Arrange = API, Act = UI, Assert = UI

**Arrange = API, Act = UI, Assert = UI.**

- **Arrange** — build every precondition via the API/DB/emulator layer above. Fast,
  deterministic, and does not exercise the behavior under test.
- **Act** — perform the behavior under test by driving the real UI a user would use. This is
  the one step nothing should substitute for — an API call standing in for the user action
  defeats the point of an e2e test.
- **Assert** — verify the observable outcome in the UI (what a user would actually see), not by
  reading the API/DB directly. Asserting via the API tests the API, not the feature.

This split reconciles two goals that look like they're in tension: "test like a real user"
(which demands the UI) and "seed fast and stay stable" (which demands the API). Blur the two —
seed through the UI, or assert by querying the database — and the result is either slow/flaky
tests or tests that stay green while the UI itself is broken.

## Discovering this project's seeding mechanism

Don't assume a fixed path or tool name — every project wires this differently. During
discovery, look for:

- **API/GraphQL helpers** — a client/module the suite already imports to call the app's own
  API for setup (mutations, REST calls), commonly something like an "API helper" or "test
  client" module.
- **DB/cloud utilities** — scripts or modules that reach the backing store or cloud services
  directly for state the API doesn't expose (a seed script, a DB helper, an infra client).
- **Emulator/mock binaries or services** — anything the suite starts or drives to simulate
  hardware or third-party events (e.g. a device emulator, a mock event trigger, a test-only
  webhook endpoint).
- **Fixtures/constants modules** — shared files holding baseline IDs, credentials, and
  pre-provisioned object references that existing specs already import.
- **The project's own e2e README/standard**, if one exists — it usually names all of the above
  explicitly.

When in doubt, grep existing specs for how their setup blocks obtain data. Whatever pattern
they already use is the mechanism to reuse, not a new one to invent.
