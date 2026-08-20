#!/usr/bin/env bash
# scripts/spike/recorder-session.sh — run ONE full SPIKE-10 collection session:
# ensure the recorder instance is up, browse the pinned site list twice, and
# print the resulting cache_log row count.
#
# EXCLUSIVE LOCK. Plans 00-02 and 00-03 run concurrently in wave 2 and each
# calls this script, and recorder-up.sh is idempotent bring-up-or-reuse. Without
# a lock, two concurrent callers race on the bring-up and drive two Playwright
# runs through one proxy. The recorded data is additive so the OUTCOME is not
# wrong, but the failure is intermittent and nobody would ever attribute it. The
# lock makes the second caller WAIT instead.
#
# macOS has no flock(1) — that is util-linux. This uses a real blocking
# fcntl.flock(LOCK_EX) via a self-re-exec: python3 opens the lock file, clears
# FD_CLOEXEC so the lock survives the exec, blocks until it owns the lock, then
# replaces itself with this script. The lock is held for the whole run and is
# released by the kernel when the process exits, however it exits.
set -euo pipefail

LOCK=".spike/recorder.lock"
mkdir -p .spike

if [ -z "${_RECORDER_SESSION_LOCKED:-}" ]; then
  export _RECORDER_SESSION_LOCKED=1
  exec python3 - "$LOCK" "$0" "$@" <<'PY'
import fcntl, os, sys
lock_path, script = sys.argv[1], sys.argv[2]
fd = os.open(lock_path, os.O_CREAT | os.O_RDWR, 0o600)
# Keep the fd across exec: an flock lives on the open file description, so the
# exec'd shell inherits ownership of the lock.
flags = fcntl.fcntl(fd, fcntl.F_GETFD)
fcntl.fcntl(fd, fcntl.F_SETFD, flags & ~fcntl.FD_CLOEXEC)
try:
    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    print("recorder-session: another session holds the lock; waiting...", file=sys.stderr)
    fcntl.flock(fd, fcntl.LOCK_EX)
os.execv("/bin/bash", ["/bin/bash", script] + sys.argv[3:])
PY
fi

cd "$(dirname "$0")/../.."

PASSES="${PASSES:-2}"
echo "recorder-session: start $(date -u +%FT%TZ)" >&2

eval "$(bash scripts/spike/recorder-up.sh | tail -1)"
: "${RECORDER_PORT:?recorder-session: recorder did not come up}"

node scripts/spike/browse.mjs --proxy "127.0.0.1:$RECORDER_PORT" --passes "$PASSES" \
  > .spike/last-browse.json || echo "recorder-session: browse reported failures (continuing)" >&2

# The recorder is LONG-LIVED and runs with --debug, which emits a span per
# proxied request. One browse session alone adds ~20 MB of stdout, so across a
# multi-day phase this would grow without bound. The logs are gitignored, but
# unbounded disk growth on a process nobody is watching is its own failure.
# Truncate in place: the writer holds an append fd, so it keeps working.
for f in .planning/phases/00-runtime-reality-check/results/runs/recorder-*/caido.stdout.log \
         .spike/recorder-data/logs/*.log .spike/agent.out.log .spike/agent.err.log; do
  [ -f "$f" ] || continue
  sz=$(wc -c < "$f" 2>/dev/null || echo 0)
  if [ "$sz" -gt 104857600 ]; then
    : > "$f"
    echo "recorder-session: truncated $f (was $sz bytes)" >&2
  fi
done

python3 scripts/spike/cache-rate.py
echo "recorder-session: done $(date -u +%FT%TZ)" >&2
