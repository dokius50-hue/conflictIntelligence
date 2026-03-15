/**
 * Agent ingestion orchestrator — entry point for `npm run ingest:agent`.
 *
 * Pipeline: load config → theatre-searcher (parallel) → deduplicator (1 Claude call)
 *         → enricher (parallel, capped concurrency) → insert into events_queue.
 *
 * Flags:
 *   --dry-run          Log results to stdout + logs/raw/ but don't insert into DB
 *   --conflict-id=X    Override CONFLICT_ID env var
 *   --dedup-hours=N    Lookback window for dedup (default 48)
 *
 * Each stage catches independently; partial failure never blocks the next stage.
 * All decisions are recorded in agent_trace JSONB on every queue row.
 */
require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { getActors, getTheatres, getLocations } = require('../../lib/db/config');
const { getRecentQueueEvents, insertQueueEvent } = require('../../lib/db/queue');
const { getPublishedEvents } = require('../../lib/db/events');
const { getAutoApproveEligible } = require('../../scripts/lib/validate');
const { getFailureCounters, resetFailureCounters } = require('../lib/llm');
const { searchTheatre } = require('./theatre-searcher');
const { deduplicateCandidates } = require('./deduplicator');
const { enrichCandidates } = require('./enricher');

const { supabase } = require('../../scripts/lib/supabase');

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {};
  for (const arg of args) {
    if (arg === '--dry-run') flags.dryRun = true;
    else if (arg.startsWith('--conflict-id=')) flags.conflictId = arg.split('=')[1];
    else if (arg.startsWith('--dedup-hours=')) flags.dedupHours = parseInt(arg.split('=')[1], 10);
  }
  return flags;
}

function ensureLogDir(subdir) {
  const dir = path.join(process.cwd(), 'logs', subdir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function saveRunLog(agentRunId, data) {
  const dir = ensureLogDir('raw');
  const ts = new Date().toISOString().slice(0, 13).replace('T', '-');
  const name = `${ts}-agent-${agentRunId.slice(0, 8)}.json`;
  fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2), 'utf8');
}

async function run() {
  const flags = parseArgs();
  const conflictId = flags.conflictId || process.env.CONFLICT_ID || 'hormuz_2026';
  const dedupHours = flags.dedupHours || 48;
  const dryRun = flags.dryRun || false;
  const agentRunId = crypto.randomUUID();

  console.log(`\n=== Agent Ingestion ===`);
  console.log(`conflict: ${conflictId} | run: ${agentRunId.slice(0, 8)} | dedup window: ${dedupHours}h | dry-run: ${dryRun}`);

  resetFailureCounters();

  // --- 1. Load config ---
  const [actors, theatres, locations] = await Promise.all([
    getActors(conflictId),
    getTheatres(conflictId),
    getLocations(conflictId),
  ]);

  if (theatres.length === 0) {
    console.error(`No theatres configured for ${conflictId}. Aborting.`);
    process.exit(1);
  }

  console.log(`Config loaded: ${theatres.length} theatres, ${actors.length} actors, ${locations.length} locations`);

  const runTrace = {
    agent_run_id: agentRunId,
    conflict_id: conflictId,
    started_at: new Date().toISOString(),
    dry_run: dryRun,
    stages: {},
  };

  // --- 2. Theatre-searcher (parallel, 1 per theatre) ---
  console.log(`\n--- Theatre search (${theatres.length} theatres in parallel) ---`);
  const searchResults = await Promise.allSettled(
    theatres.map((t) => searchTheatre(t, actors, locations, conflictId))
  );

  let allCandidates = [];
  const searchTraces = [];
  for (let i = 0; i < searchResults.length; i++) {
    const r = searchResults[i];
    const theatreId = theatres[i].id;
    if (r.status === 'fulfilled') {
      const { candidates, rejected, trace } = r.value;
      console.log(`  ${theatreId}: ${candidates.length} candidates, ${rejected.length} rejected`);
      allCandidates.push(...candidates);
      searchTraces.push(trace);
    } else {
      console.error(`  ${theatreId}: FAILED — ${r.reason?.message || r.reason}`);
      searchTraces.push({ theatre_id: theatreId, error: r.reason?.message || String(r.reason) });
    }
  }
  runTrace.stages.search = searchTraces;

  if (allCandidates.length === 0) {
    console.log('\nNo candidates from any theatre. Exiting.');
    runTrace.finished_at = new Date().toISOString();
    runTrace.result = 'no_candidates';
    saveRunLog(agentRunId, runTrace);
    return;
  }

  console.log(`\nTotal candidates: ${allCandidates.length}`);

  // --- 3. Deduplicator (1 batched Claude call) ---
  console.log(`\n--- Deduplication (${dedupHours}h lookback) ---`);
  const [recentQueue, recentPublished] = await Promise.all([
    getRecentQueueEvents(conflictId, dedupHours),
    getPublishedEvents({ conflictId, sinceHours: dedupHours, limit: 200 }),
  ]);
  console.log(`  Comparing against ${recentQueue.length} queue + ${recentPublished.length} published events`);

  const dedupResult = await deduplicateCandidates(allCandidates, recentQueue, recentPublished);
  runTrace.stages.dedup = dedupResult.trace;

  const newCandidates = dedupResult.candidates.filter((c) => c._dedup?.verdict !== 'duplicate');
  const duplicates = dedupResult.candidates.filter((c) => c._dedup?.verdict === 'duplicate');
  console.log(`  Result: ${newCandidates.length} new, ${duplicates.length} duplicates`);

  if (newCandidates.length === 0) {
    console.log('\nAll candidates are duplicates. Exiting.');
    runTrace.finished_at = new Date().toISOString();
    runTrace.result = 'all_duplicates';
    saveRunLog(agentRunId, runTrace);
    return;
  }

  // --- 4. Enricher (parallel, capped concurrency) ---
  console.log(`\n--- Enrichment (${newCandidates.length} candidates) ---`);
  const enrichResult = await enrichCandidates(dedupResult.candidates);
  runTrace.stages.enrichment = enrichResult.trace;

  const toInsert = enrichResult.enriched;
  console.log(`  Enriched: ${toInsert.length} candidates`);

  const corrobStats = {};
  for (const c of toInsert) {
    const s = c.corroboration_status || 'unknown';
    corrobStats[s] = (corrobStats[s] || 0) + 1;
  }
  console.log(`  Corroboration: ${JSON.stringify(corrobStats)}`);

  // Check if APIs are systematically failing
  const failures = getFailureCounters();
  if (failures.perplexity > 2 || failures.claude > 2) {
    console.warn(`\n⚠ Elevated API failures — perplexity: ${failures.perplexity}, claude: ${failures.claude}`);
  }

  // --- 5. Insert into events_queue ---
  if (dryRun) {
    console.log(`\n--- DRY RUN — skipping insert ---`);
    console.log(`Would insert ${toInsert.length} events into events_queue`);
    for (const c of toInsert) {
      console.log(`  [${c.corroboration_status}] ${c.title}`);
    }
    runTrace.result = 'dry_run';
    runTrace.would_insert = toInsert.length;
  } else {
    console.log(`\n--- Inserting ${toInsert.length} events ---`);
    let inserted = 0;
    let insertErrors = 0;

    for (const candidate of toInsert) {
      const agentTrace = {
        search: runTrace.stages.search.find((t) => t.theatre_id === (candidate.theatres || [])[0]) || {},
        dedup: candidate._dedup || {},
        enrichment: candidate._enrichment || {},
      };

      const autoApprove = await getAutoApproveEligible(
        supabase,
        candidate.source_name,
        candidate.source_type,
        conflictId
      );

      const row = {
        conflict_id: conflictId,
        reported_at: candidate.reported_at || new Date().toISOString(),
        occurred_at: candidate.occurred_at || null,
        time_precision: candidate.time_precision || 'unknown',
        title: candidate.title,
        description: candidate.description,
        theatres: candidate.theatres || [],
        actors: candidate.actors || [],
        source_name: candidate.source_name || '',
        source_url: candidate.source_url || '',
        source_type: candidate.source_type || 'social',
        confidence: candidate.confidence || 'medium',
        escalation_direction: candidate.escalation_direction || null,
        escalation_intensity: candidate.escalation_intensity || null,
        status: 'pending',
        ingestion_source: 'perplexity',
        processing_mode: 'agent',
        agent_run_id: agentRunId,
        agent_trace: agentTrace,
        auto_approve_eligible: autoApprove,
        raw_input: JSON.stringify(candidate),
        key_findings: candidate.key_findings || [],
        confidence_reasoning: candidate.confidence_reasoning || null,
        corroboration_status: candidate.corroboration_status || 'unknown',
      };

      const { error } = await insertQueueEvent(row);
      if (error) {
        console.error(`  Insert failed: ${error.message} — ${candidate.title}`);
        insertErrors++;
      } else {
        inserted++;
      }
    }

    console.log(`\nInserted: ${inserted}, errors: ${insertErrors}`);
    runTrace.result = { inserted, errors: insertErrors };
  }

  runTrace.finished_at = new Date().toISOString();
  saveRunLog(agentRunId, runTrace);

  // Summary with dry-run output to stdout
  console.log(`\n=== Run ${agentRunId.slice(0, 8)} complete ===`);
  console.log(`Log saved to logs/raw/\n`);
}

run().catch((err) => {
  console.error('Agent ingestion failed:', err);
  process.exit(1);
});
