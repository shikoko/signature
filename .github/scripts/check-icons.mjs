// Fails if an icon that ever reached main in icons/v1/ is now missing or different from the
// version that first reached it. Copied signatures in people's mail link to these files, so they
// must never change; new artwork goes into icons/v2/.
//
//     node .github/scripts/check-icons.mjs
//
// Needs the repository's full history (actions/checkout with fetch-depth: 0).
import { execFileSync } from "node:child_process";

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

if (git("rev-parse", "--is-shallow-repository") === "true") {
  console.error("This needs the full history: check out with fetch-depth: 0.");
  process.exit(1);
}

// Each file that reached main under icons/v1/, with the commit that first brought it there.
// Only main's own line of history counts (--first-parent), with each merge seen as the net
// change of its pull request, so an icon added and removed within one pull request, never
// published, isn't held against main.
const firstAdded = new Map();
let commit = null;
const log = git("log", "--first-parent", "--diff-merges=first-parent", "--reverse", "--diff-filter=A", "--format=%H", "--name-only", "--", "icons/v1/");
for (const line of log.split("\n")) {
  if (/^[0-9a-f]{40}$/.test(line)) commit = line;
  else if (line && !firstAdded.has(line)) firstAdded.set(line, commit);
}

const problems = [];
for (const [file, first] of firstAdded) {
  let now = null;
  try { now = git("rev-parse", "HEAD:" + file); } catch { /* not there any more */ }
  if (now === null) problems.push(file + " was deleted or moved");
  else if (now !== git("rev-parse", first + ":" + file)) problems.push(file + " was changed");
}

if (problems.length) {
  console.error("Published icons must never change, because signatures in people's mail link to them:");
  problems.forEach((p) => console.error("  " + p));
  console.error("Put them back as they were. New artwork for an icon goes into icons/v2/.");
  process.exit(1);
}
console.log(firstAdded.size + " published icons checked; none changed.");
