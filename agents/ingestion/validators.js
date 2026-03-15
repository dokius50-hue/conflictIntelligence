/**
 * Zod schemas for every agent stage output. Deterministic validation gate
 * between LLM output and the rest of the pipeline.
 */
const { z } = require('zod');

const keyFindingSchema = z.object({
  finding: z.string().min(1),
  attribution: z.string().optional().default('unknown'),
  type: z.enum(['fact', 'claim', 'analysis', 'rumour']).optional().default('fact'),
});

const actorRefSchema = z.object({
  id: z.string().min(1),
  role: z.string().optional().default('observer'),
  side: z.string().nullable().optional().default(null),
});

const candidateEventSchema = z.object({
  reported_at: z.string().optional().default(''),
  occurred_at: z.string().nullable().optional().default(null),
  time_precision: z.enum(['exact', 'approximate', 'date_only', 'unknown']).optional().default('unknown'),
  title: z.string().min(1).max(120),
  description: z.string().min(1),
  theatres: z.array(z.string()).min(1),
  actors: z.array(actorRefSchema).optional().default([]),
  source_name: z.string().optional().default(''),
  source_url: z.string().url().optional().default(''),
  source_type: z.enum(['wire', 'analysis', 'state_media', 'social', 'official']).optional().default('social'),
  confidence: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  escalation_direction: z.enum(['escalatory', 'de-escalatory', 'neutral', 'ambiguous']).nullable().optional().default(null),
  escalation_intensity: z.number().int().min(1).max(5).nullable().optional().default(null),
  key_findings: z.array(keyFindingSchema).optional().default([]),
  confidence_reasoning: z.string().nullable().optional().default(null),
});

const candidateArraySchema = z.array(candidateEventSchema);

const dedupVerdictSchema = z.object({
  candidate_index: z.number().int().min(0),
  verdict: z.enum(['new', 'duplicate']),
  duplicate_of_queue_id: z.string().uuid().nullable().optional().default(null),
  reasoning: z.string().optional().default(''),
});

const dedupResultSchema = z.array(dedupVerdictSchema);

const enrichmentResultSchema = z.object({
  corroboration_status: z.enum(['single_source', 'multi_corroborating', 'multi_divergent', 'unknown']).default('unknown'),
  corroborating_urls: z.array(z.string().url()).optional().default([]),
  reasoning: z.string().optional().default(''),
});

/**
 * Validate an array of candidate events through Zod.
 * Returns { valid: CandidateEvent[], rejected: { item, errors }[] }.
 */
function validateCandidates(rawArray) {
  const valid = [];
  const rejected = [];
  for (const item of rawArray) {
    const result = candidateEventSchema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      rejected.push({ item, errors });
    }
  }
  return { valid, rejected };
}

module.exports = {
  keyFindingSchema,
  actorRefSchema,
  candidateEventSchema,
  candidateArraySchema,
  dedupVerdictSchema,
  dedupResultSchema,
  enrichmentResultSchema,
  validateCandidates,
};
