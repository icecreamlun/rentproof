import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const upsert = mutation({
  args: {
    caseId: v.string(),
    stage: v.string(),
    jurisdiction: v.optional(v.string()),
    landlord: v.optional(v.string()),
    claimedDeduction: v.optional(v.number()),
    unlawfullyWithheld: v.optional(v.number()),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('cases')
      .withIndex('by_caseId', (q) => q.eq('caseId', args.caseId))
      .unique();

    const doc = { ...args, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, doc);
      return existing._id;
    }
    return await ctx.db.insert('cases', doc);
  },
});

export const get = query({
  args: { caseId: v.string() },
  handler: async (ctx, { caseId }) =>
    await ctx.db
      .query('cases')
      .withIndex('by_caseId', (q) => q.eq('caseId', caseId))
      .unique(),
});

export const timeline = query({
  args: { caseId: v.string() },
  handler: async (ctx, { caseId }) => {
    const events = await ctx.db
      .query('events')
      .withIndex('by_caseId', (q) => q.eq('caseId', caseId))
      .collect();
    const pending = await ctx.db
      .query('followUps')
      .withIndex('by_caseId', (q) => q.eq('caseId', caseId))
      .collect();
    return {
      events: events.sort((a, b) => a.at - b.at),
      followUps: pending.filter((f) => f.status === 'scheduled'),
    };
  },
});

/** Every meaningful step in a case lands here, so the timeline is the case. */
export const logEvent = mutation({
  args: {
    caseId: v.string(),
    kind: v.string(),
    label: v.string(),
    detail: v.optional(v.string()),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => await ctx.db.insert('events', { ...args, at: Date.now() }),
});
