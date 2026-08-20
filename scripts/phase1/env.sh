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

# The Caido build every Phase 0 threshold was measured on.
export P1_EXPECT_VERSION="${P1_EXPECT_VERSION:-0.57.1}"
