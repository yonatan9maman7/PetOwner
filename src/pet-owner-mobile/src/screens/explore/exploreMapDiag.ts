/**
 * Lightweight instrumentation for the Explore map. Every event gets a monotonically
 * increasing sequence + a short tag + structured fields, so when the app hard-crashes
 * on iOS (native MapKit) we can read the last N events from the Metro / expo start
 * terminal and see exactly what the JS layer was doing at the moment of the crash.
 *
 * Keep this file dependency-free and side-effect-free on import.
 *
 * To enable: set EXPLORE_MAP_DIAG_ENABLED = true below, then reload the app.
 * To disable: set to false — mapDiag becomes a true zero-cost no-op (Hermes will
 * eliminate even the call-site argument allocations via dead-code elimination).
 */

const EXPLORE_MAP_DIAG_ENABLED = true;

let seq = 0;
let lastTs = Date.now();

type DiagFields = Record<string, unknown>;

function mapDiagImpl(tag: string, fields?: DiagFields): void {
  const now = Date.now();
  const dt = now - lastTs;
  lastTs = now;
  seq += 1;

  let fieldStr = "";
  if (fields) {
    try {
      fieldStr = " " + JSON.stringify(fields);
    } catch {
      fieldStr = " [unserializable]";
    }
  }
  // Prefix makes it trivial to grep: `rg "\[MAP#" terminals/4.txt`
  // eslint-disable-next-line no-console
  console.log(`[MAP#${seq} +${dt}ms] ${tag}${fieldStr}`);
}

// When disabled, export a literal no-op so Hermes dead-code-eliminates every
// call site (including the object-literal arguments passed to it).
export const mapDiag: (tag: string, fields?: DiagFields) => void =
  EXPLORE_MAP_DIAG_ENABLED ? mapDiagImpl : () => {};
