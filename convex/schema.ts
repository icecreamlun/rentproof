import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  /**
   * A deposit case outlives the session that created it by about a year:
   * you photograph the place on day one and do not come back until you move
   * out. That is the whole reason this lives in Convex and not in a file.
   */
  cases: defineTable({
    caseId: v.string(),
    stage: v.string(),
    jurisdiction: v.optional(v.string()),
    landlord: v.optional(v.string()),
    claimedDeduction: v.optional(v.number()),
    unlawfullyWithheld: v.optional(v.number()),
    payload: v.string(),
    updatedAt: v.number(),
  }).index('by_caseId', ['caseId']),

  /**
   * Append only. The phone call writes into this from Vapi's server webhook
   * while it is still in progress, and every open tab watching the case
   * re renders as each turn lands.
   */
  events: defineTable({
    caseId: v.string(),
    kind: v.string(),
    label: v.string(),
    detail: v.optional(v.string()),
    amount: v.optional(v.number()),
    at: v.number(),
  }).index('by_caseId', ['caseId']),

  /** Scheduled escalations, so a silent landlord is not a dead end. */
  followUps: defineTable({
    caseId: v.string(),
    phone: v.string(),
    dueAt: v.number(),
    status: v.string(),
    scheduledFnId: v.optional(v.string()),
  }).index('by_caseId', ['caseId']),
});
