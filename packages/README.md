# DefMiner

Passive JavaScript analysis for [Caido](https://caido.io).

DefMiner watches proxied responses, hashes the JavaScript it sees, and remembers
each artifact by its content digest along with where it was observed.

**Coverage is proxy-only.** Replay, Automate, workflows, plugin-originated sends
and `caido:http` fetches never reach the passive hook, and a browser-cache hit
never enters Caido at all. DefMiner reports what it observed on the proxy — never
everything that exists on a target.

## Requirements

Caido 0.57.1 or newer. Running below that minimum disables passive analysis and
reports the reason rather than failing obscurely.
