#!/usr/bin/env bash
# scripts/phase1/env.sh — the WHOLE Phase 1 port block and path set, allocated up front.
#
# Sourced, never executed:
#     source scripts/phase1/env.sh
#
# Allocated in one place on purpose. Phase 0 nearly collided with its own
# long-lived recorder because each script picked its own port; here every Phase 1
# port is reserved before the first script needs it, so no later Phase 1 plan has
# to edit this file and no two Phase 1 scripts can pick the same number.
#
# DERIVATION of the 8971-8975 block — every excluded port is excluded for a
# reason that was verified, not assumed:
#   8080       the operator's LIVE Caido desktop instance with real project data.
#              scripts/spike/instance.sh:96-99 refuses it unconditionally.
#   8998       the SPIKE-10 recorder LaunchAgent's instance.
#   8999       scripts/spike/instance.sh's default PORT.
#   3100       caido.config.ts `watch.port` — the caido-dev watch server.
#   8991-8996  named as Phase 0's in scripts/spike/instance.sh:98.
#   8981-8985  named as Phase 0's in scripts/spike/instance.sh:98.
#   8081-8083  Phase 0's origin.py ports (run-spike-08.sh and siblings).
# 8971-8975 sits below every one of them and was verified unbound when Phase 1
# was planned. RESEARCH.md Open Question 5 originally suggested 8990-8997; that
# range overlaps Phase 0's own in six of eight ports and was corrected here.

# The general-purpose Phase 1 Caido instance (tracer, runtime answers, SPA load).
export P1_CAIDO_PORT="${P1_CAIDO_PORT:-8971}"
# The local origin serving Phase 1 fixtures.
export P1_ORIGIN_PORT="${P1_ORIGIN_PORT:-8972}"
# Plan 01-06's two compatibility legs: current release and below-minimum.
export P1_COMPAT_PORT="${P1_COMPAT_PORT:-8973}"
export P1_COMPAT_PORT_ALT="${P1_COMPAT_PORT_ALT:-8974}"
# Held in reserve so a later Phase 1 need does not reach outside the block.
export P1_SPARE_PORT="${P1_SPARE_PORT:-8975}"

# Phase 1's results root. instance.sh writes runs/<RUN_ID>/ underneath it, so
# Phase 1 runs never land in Phase 0's results directory.
export P1_OUT="${P1_OUT:-.planning/phases/01-skeleton-persistence-compatibility/results}"

# ALWAYS the app-bundle path. Bare `caido-cli` on PATH resolves to a STALE 0.55.3
# on this machine, and a measurement recorded against it would be silently wrong.
export P1_CAIDO_BIN="${P1_CAIDO_BIN:-/Applications/Caido.app/Contents/Resources/bin/caido-cli}"
# That same stale 0.55.3 is a genuinely useful fixture: plan 01-06 uses it as a
# real below-minimum build for the COMPAT-01 negative leg.
export P1_CAIDO_BIN_OLD="${P1_CAIDO_BIN_OLD:-$HOME/.caido/caido-cli}"

# The Caido build the live Phase 1 harnesses run against.
#
# CHANGED 0.57.1 -> 0.58.0 ON 2026-08-21. Operator decision, taken at plan 01-07's
# blocking-human checkpoint. This is an EVIDENCE-CONTRACT change, not a version
# bump, so it is recorded here rather than made silently:
#
#   WHY IT HAD TO CHANGE. 0.57.1 is GONE from this host and cannot be recovered.
#   The app bundle at $P1_CAIDO_BIN auto-upgraded IN PLACE (mtime 2026-08-20
#   12:49) — it is the same binary that ran leg A of compat-smoke.json as 0.57.1.
#   It cannot be re-fetched either: `fetch-caido.sh`'s PINNED_SHA512 table has no
#   0.57.1 entry, and decision P6-D5 recorded that api.caido.io publishes hashes
#   for `latest` ONLY (/releases, /releases/0.57.1 and /releases/v0.57.1 all 404).
#   Downloading it unpinned is precisely the supply-chain hole that gate exists to
#   close. 0.58.0 is the only pinned build available.
#
#   THE COST, STATED PLAINLY RATHER THAN GLOSSED. This line used to read "The
#   Caido build every Phase 0 threshold was measured on", and that sentence is now
#   FALSE — which is why the sentence is gone rather than left standing. Phase 0's
#   thresholds (MAX_SYNC_SLICE_MS, PASSIVE_MAX_BYTES, the send cliffs, everything
#   in go-no-go.json) were measured on 0.57.1 and have NOT been re-measured on
#   0.58.0. COMPATIBLE IS NOT RE-MEASURED: plan 01-06 proved all 16 SDK surfaces
#   behave identically across the two builds and that leg B reports
#   `compatible: true`, which is a statement about SURFACE BEHAVIOUR, not about
#   timing or memory. A phase that wants to trust a Phase 0 NUMBER on 0.58.0 must
#   re-measure it first. Accepted knowingly by the operator on 2026-08-21.
#
#   WHY IT IS SAFE FOR THE THING IT UNBLOCKED. Plan 01-07's tracer asserts query
#   redaction, which is plugin-side string handling with no version-dependent
#   behaviour whatsoever. It is not a threshold measurement.
#
# Override per-invocation if a 0.57.1 build is ever restored:
#   P1_EXPECT_VERSION=0.57.1 bash scripts/phase1/tracer-e2e.sh
export P1_EXPECT_VERSION="${P1_EXPECT_VERSION:-0.58.0}"
