import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * The client-side audit transport.
 *
 * It does not decide what an entry says — the server takes actor, session and
 * IP from the session — so what is tested here is delivery: each entry reaches
 * the server exactly once, survives a reload if it has not been sent, and a
 * server that keeps rejecting it does not block everything behind it.
 *
 * "Exactly once" is the load-bearing property. A duplicate is not a cosmetic
 * defect in a tamper-evident chain: it is a second row, with its own sequence
 * number and hash, recording an action that happened once.
 */

const appendAudit = vi.fn<(entries: unknown[]) => Promise<{ written: number }>>();

vi.mock("@/lib/api", () => ({
  api: { appendAudit: (entries: unknown[]) => appendAudit(entries) },
  ApiError: class ApiError extends Error {},
}));

async function freshModule() {
  vi.resetModules();
  return import("@/lib/auditLog");
}

/** Lets the batching timer fire and the in-flight request settle. */
async function settle(ms = 600) {
  await vi.advanceTimersByTimeAsync(ms);
  await vi.runAllTicks?.();
  await Promise.resolve();
}

beforeEach(() => {
  localStorage.clear();
  appendAudit.mockReset();
  appendAudit.mockResolvedValue({ written: 1 });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("logAudit delivery", () => {
  it("sends one entry exactly once", async () => {
    const { logAudit } = await freshModule();
    logAudit({ action: "A", category: "client", entity: "e" });

    await settle();

    expect(appendAudit).toHaveBeenCalledTimes(1);
    const sent = appendAudit.mock.calls[0][0];
    expect(sent).toHaveLength(1);
  });

  it("does not send the same entry twice", async () => {
    // The regression: entries were held in an in-memory buffer *and* mirrored
    // to the outbox, and the flush concatenated both — so every entry was
    // posted twice and appeared twice in the chain.
    const { logAudit } = await freshModule();
    logAudit({ action: "A", category: "client", entity: "e", entityId: "1" });
    logAudit({ action: "B", category: "client", entity: "e", entityId: "2" });

    await settle();

    const everySent = appendAudit.mock.calls.flatMap((c) => c[0] as { entityId: string }[]);
    expect(everySent).toHaveLength(2);
    expect(everySent.map((e) => e.entityId).sort()).toEqual(["1", "2"]);
  });

  it("clears the outbox once the server accepts", async () => {
    const { logAudit, pendingAuditCount } = await freshModule();
    logAudit({ action: "A", category: "client", entity: "e" });
    expect(pendingAuditCount()).toBe(1);

    await settle();

    expect(pendingAuditCount()).toBe(0);
  });
});

describe("failure handling", () => {
  it("keeps an entry queued when the send fails transiently", async () => {
    const { logAudit, pendingAuditCount } = await freshModule();
    appendAudit.mockRejectedValue(Object.assign(new Error("offline"), { status: 0 }));

    logAudit({ action: "A", category: "client", entity: "e" });
    await settle();

    expect(pendingAuditCount()).toBe(1);
  });

  it("retries the kept entry on the next flush, still exactly once", async () => {
    const { logAudit, flushAuditLog, pendingAuditCount } = await freshModule();
    appendAudit.mockRejectedValueOnce(Object.assign(new Error("offline"), { status: 0 }));

    logAudit({ action: "A", category: "client", entity: "e", entityId: "1" });
    await settle();
    expect(pendingAuditCount()).toBe(1);

    appendAudit.mockResolvedValue({ written: 1 });
    await flushAuditLog();

    const everySent = appendAudit.mock.calls.flatMap((c) => c[0] as { entityId: string }[]);
    expect(everySent.filter((e) => e.entityId === "1")).toHaveLength(2); // one failed, one succeeded
    expect(pendingAuditCount()).toBe(0);
  });

  it("keeps an entry logged while a send is in flight", async () => {
    // The subtle one: the request is awaited, and anything logged during that
    // window lands on the end of the queue. Rewriting a pre-flight snapshot
    // over the queue on completion would discard it, and nothing would notice
    // until the entry was missing from the trail.
    const { logAudit, flushAuditLog, pendingAuditCount } = await freshModule();

    let release: (v: { written: number }) => void = () => {};
    appendAudit.mockImplementationOnce(
      () => new Promise((resolve) => { release = resolve; }),
    );

    logAudit({ action: "A", category: "client", entity: "e", entityId: "first" });
    const inFlight = flushAuditLog();

    // Logged while the request is open.
    logAudit({ action: "B", category: "client", entity: "e", entityId: "during" });

    release({ written: 1 });
    await inFlight;

    expect(pendingAuditCount()).toBe(1);

    appendAudit.mockResolvedValue({ written: 1 });
    await flushAuditLog();

    const sent = appendAudit.mock.calls.flatMap((c) => c[0] as { entityId: string }[]);
    expect(sent.map((e) => e.entityId)).toEqual(["first", "during"]);
  });

  it("retries after a transient failure without being prompted by a new entry", async () => {
    // An idle tab may not log again for minutes. Entries must not sit unsent
    // waiting to be nudged.
    const { logAudit, pendingAuditCount } = await freshModule();
    appendAudit.mockRejectedValueOnce(Object.assign(new Error("offline"), { status: 503 }));

    logAudit({ action: "A", category: "client", entity: "e" });
    await settle();
    expect(pendingAuditCount()).toBe(1);

    appendAudit.mockResolvedValue({ written: 1 });
    // No further logAudit call — only time passes.
    await settle(2000);

    expect(pendingAuditCount()).toBe(0);
  });

  it("drops an entry the server rejects as invalid, so it cannot block the queue", async () => {
    const { logAudit, pendingAuditCount } = await freshModule();
    appendAudit.mockRejectedValue(Object.assign(new Error("bad"), { status: 400 }));

    logAudit({ action: "A", category: "client", entity: "e" });
    await settle();

    expect(pendingAuditCount()).toBe(0);
  });

  it("recovers entries left in storage by a previous page load", async () => {
    const { logAudit } = await freshModule();
    appendAudit.mockRejectedValue(Object.assign(new Error("offline"), { status: 0 }));
    logAudit({ action: "A", category: "client", entity: "e", entityId: "kept" });
    await settle();

    // A reload: a new module instance reads what storage still holds.
    appendAudit.mockReset();
    appendAudit.mockResolvedValue({ written: 1 });
    const reloaded = await freshModule();
    expect(reloaded.pendingAuditCount()).toBe(1);

    await reloaded.flushAuditLog();
    const sent = appendAudit.mock.calls.flatMap((c) => c[0] as { entityId: string }[]);
    expect(sent.map((e) => e.entityId)).toEqual(["kept"]);
  });
});

describe("sign-out", () => {
  it("does not let a discarded session's request eat the next session's entries", async () => {
    // The defect: `discardAuditQueue` emptied the queue but left the in-flight
    // request running, and that request finished by removing `batch.length`
    // entries from whatever queue existed when it landed. After a discard that
    // is the *next* session's queue, so signing out mid-append silently
    // deleted up to 25 of the next user's entries — from an audit trail, with
    // nothing to show it had happened.
    const { logAudit, flushAuditLog, discardAuditQueue, pendingAuditCount } = await freshModule();

    let release: (v: { written: number }) => void = () => {};
    appendAudit.mockImplementationOnce(
      () => new Promise((resolve) => { release = resolve; }),
    );

    logAudit({ action: "A", category: "client", entity: "e", entityId: "old-session" });
    const inFlight = flushAuditLog();

    // Sign-out: the queue is dropped while the request is still open.
    discardAuditQueue();

    // The next session starts logging before the old request comes back.
    logAudit({ action: "B", category: "client", entity: "e", entityId: "new-session" });

    release({ written: 1 });
    await inFlight;

    expect(pendingAuditCount()).toBe(1);

    appendAudit.mockResolvedValue({ written: 1 });
    await flushAuditLog();

    const sent = appendAudit.mock.calls.flatMap((c) => c[0] as { entityId: string }[]);
    expect(sent.map((e) => e.entityId)).toEqual(["old-session", "new-session"]);
  });

  it("waits for a request already in flight rather than resolving straight away", async () => {
    // Sign-out awaits this before revoking the cookie. Returning early meant
    // the revoke could overtake the delivery it was supposed to follow, and the
    // entries were then discarded unsent.
    const { logAudit, flushAuditLog } = await freshModule();

    let release: (v: { written: number }) => void = () => {};
    let settled = false;
    appendAudit.mockImplementationOnce(
      () => new Promise((resolve) => { release = resolve; }),
    );

    logAudit({ action: "A", category: "client", entity: "e" });
    const first = flushAuditLog();

    // A second caller arriving while the first request is open.
    const second = flushAuditLog().then(() => { settled = true; });

    await Promise.resolve();
    expect(settled, "flushAuditLog resolved before the request came back").toBe(false);

    release({ written: 1 });
    await Promise.all([first, second]);
    expect(settled).toBe(true);
  });
});

describe("takeAuditQueue", () => {
  it("hands over what is queued and empties the queue in one step", async () => {
    // Sign-out carries these in the request that revokes the session, so the
    // handover and the clear cannot be two steps with a gap between them.
    const { logAudit, takeAuditQueue, pendingAuditCount } = await freshModule();
    logAudit({ action: "A", category: "client", entity: "e", entityId: "1" });
    logAudit({ action: "B", category: "client", entity: "e", entityId: "2" });

    const taken = takeAuditQueue();

    expect(taken.map((e) => e.entityId)).toEqual(["1", "2"]);
    expect(pendingAuditCount()).toBe(0);
  });

  it("does not hand over entries a request in flight is already delivering", async () => {
    // `send` slices its batch but leaves it in the queue until the server
    // answers. Taking from the front while that request is open handed the same
    // entries to the logout request too, and the server appends both — one
    // action, two rows, each hashing correctly. In a tamper-evident chain that
    // is worse than losing them: a gap is visible as a gap.
    const { logAudit, flushAuditLog, takeAuditQueue } = await freshModule();

    let release: (v: { written: number }) => void = () => {};
    appendAudit.mockImplementationOnce(
      () => new Promise((resolve) => { release = resolve; }),
    );

    logAudit({ action: "A", category: "client", entity: "e", entityId: "on-the-wire" });
    const inFlight = flushAuditLog();
    logAudit({ action: "B", category: "client", entity: "e", entityId: "still-queued" });

    const taken = takeAuditQueue();

    // The open request carries "on-the-wire"; sign-out must carry only the rest.
    expect(taken.map((e) => e.entityId)).toEqual(["still-queued"]);

    release({ written: 1 });
    await inFlight;

    const sent = appendAudit.mock.calls.flatMap((c) => c[0] as { entityId: string }[]);
    expect(sent.map((e) => e.entityId)).toEqual(["on-the-wire"]);
  });

  it("does not carry a discarded session's batch length into the next session", async () => {
    // `inFlightCount` indexes positions in the queue it was measured against.
    // Left standing across a discard it described a batch from a session that
    // was gone, so the NEXT sign-out skipped that many entries of the new
    // session's queue — and skipped entries at sign-out are dropped, not
    // deferred. Two sign-outs while one append is still open is all it takes.
    const { logAudit, flushAuditLog, takeAuditQueue } = await freshModule();

    let release: (v: { written: number }) => void = () => {};
    appendAudit.mockImplementationOnce(
      () => new Promise((resolve) => { release = resolve; }),
    );

    // Session A: two entries, both on the wire, then sign out.
    logAudit({ action: "A", category: "client", entity: "e", entityId: "a1" });
    logAudit({ action: "A", category: "client", entity: "e", entityId: "a2" });
    const inFlight = flushAuditLog();
    expect(takeAuditQueue()).toEqual([]); // both are already being delivered

    // Session B logs and signs out while A's request is still open.
    logAudit({ action: "B", category: "client", entity: "e", entityId: "b1" });
    logAudit({ action: "B", category: "client", entity: "e", entityId: "b2" });

    expect(takeAuditQueue().map((e) => e.entityId)).toEqual(["b1", "b2"]);

    release({ written: 2 });
    await inFlight;
  });

  it("invalidates a request already in flight, like any other discard", async () => {
    const { logAudit, flushAuditLog, takeAuditQueue, pendingAuditCount } = await freshModule();

    let release: (v: { written: number }) => void = () => {};
    appendAudit.mockImplementationOnce(
      () => new Promise((resolve) => { release = resolve; }),
    );

    logAudit({ action: "A", category: "client", entity: "e", entityId: "old" });
    const inFlight = flushAuditLog();

    takeAuditQueue();
    logAudit({ action: "B", category: "client", entity: "e", entityId: "new" });

    release({ written: 1 });
    await inFlight;

    expect(pendingAuditCount()).toBe(1);
  });
});
