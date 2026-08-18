import { v } from 'convex/values';
import { api, internal } from './_generated/api';
import { action, internalAction, internalMutation, mutation } from './_generated/server';

/**
 * "Send the letter, and if they go quiet, call them."
 *
 * The gap between those two clauses is fourteen days. A request handler cannot
 * wait fourteen days, so the wait itself is the thing Convex owns: the delay is
 * durable, survives every deploy, and fires whether or not anyone has the tab
 * open.
 */
export const schedule = mutation({
  args: { caseId: v.string(), phone: v.string(), delayMs: v.number() },
  handler: async (ctx, { caseId, phone, delayMs }) => {
    const dueAt = Date.now() + delayMs;

    const fnId = await ctx.scheduler.runAfter(delayMs, internal.followUps.fire, {
      caseId,
      phone,
    });

    const id = await ctx.db.insert('followUps', {
      caseId,
      phone,
      dueAt,
      status: 'scheduled',
      scheduledFnId: fnId,
    });

    const days = Math.round(delayMs / 86_400_000);
    await ctx.db.insert('events', {
      caseId,
      kind: 'followup_scheduled',
      label: 'Escalation armed',
      detail:
        days >= 1
          ? `If the landlord has not replied in ${days} days, RentProof calls them automatically.`
          : `Demo timer: the automatic call fires in ${Math.round(delayMs / 1000)} seconds.`,
      at: Date.now(),
    });

    return id;
  },
});

export const cancel = mutation({
  args: { caseId: v.string() },
  handler: async (ctx, { caseId }) => {
    const pending = await ctx.db
      .query('followUps')
      .withIndex('by_caseId', (q) => q.eq('caseId', caseId))
      .collect();

    for (const f of pending.filter((x) => x.status === 'scheduled')) {
      if (f.scheduledFnId) await ctx.scheduler.cancel(f.scheduledFnId as never);
      await ctx.db.patch(f._id, { status: 'cancelled' });
    }

    await ctx.db.insert('events', {
      caseId,
      kind: 'followup_cancelled',
      label: 'Escalation stood down',
      detail: 'The landlord replied, so the automatic call was cancelled.',
      at: Date.now(),
    });
  },
});

export const markFired = internalMutation({
  args: { caseId: v.string(), detail: v.string() },
  handler: async (ctx, { caseId, detail }) => {
    const pending = await ctx.db
      .query('followUps')
      .withIndex('by_caseId', (q) => q.eq('caseId', caseId))
      .collect();
    for (const f of pending.filter((x) => x.status === 'scheduled')) {
      await ctx.db.patch(f._id, { status: 'fired' });
    }
    await ctx.db.insert('events', {
      caseId,
      kind: 'followup_fired',
      label: 'Deadline passed, calling now',
      detail,
      at: Date.now(),
    });
  },
});

/** The scheduled job itself. It places the call rather than nagging the user. */
export const fire = internalAction({
  args: { caseId: v.string(), phone: v.string() },
  handler: async (ctx, { caseId, phone }) => {
    const appUrl = process.env.APP_URL;

    if (!appUrl) {
      await ctx.runMutation(internal.followUps.markFired, {
        caseId,
        detail: `No reply within the deadline. Call to ${phone} would be placed now (set APP_URL in the Convex dashboard to dial for real).`,
      });
      return;
    }

    try {
      const res = await fetch(`${appUrl}/api/argue/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, to: phone }),
      });
      const json = (await res.json()) as { ok?: boolean; call?: { id: string } };
      await ctx.runMutation(internal.followUps.markFired, {
        caseId,
        detail: json.ok
          ? `Automatic call placed to ${phone}, reference ${json.call?.id}.`
          : `Automatic call to ${phone} failed, the letter stands as the record.`,
      });
    } catch (e) {
      await ctx.runMutation(internal.followUps.markFired, {
        caseId,
        detail: `Automatic call to ${phone} could not be placed: ${(e as Error).message}`,
      });
    }
  },
});

/** Lets the UI arm a follow up without importing internal references. */
export const armFromClient = action({
  args: { caseId: v.string(), phone: v.string(), delayMs: v.number() },
  handler: async (ctx, args) => await ctx.runMutation(api.followUps.schedule, args),
});
