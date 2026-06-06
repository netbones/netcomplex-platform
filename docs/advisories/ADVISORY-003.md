# ADVISORY-003 — npm Supply Chain Poisoning

**Status:** Active  
**Severity:** Critical  
**Issued:** 2026-06-06  
**Applies to:** All services in the monorepo (Next.js app, tRPC server, shared packages)  
**Package manager:** pnpm 10.33.0  
**Reference:** [LocalCan — NPM Security Best Practices: Defending Against Supply Chain Attacks](https://www.localcan.com/blog/npm-security-best-practices-supply-chain-attacks)

---

## Background

In May 2026 a confirmed supply chain attack hit the TanStack ecosystem — 42 packages, 84 malicious versions, published in a six-minute burst and live for roughly twenty minutes before a security researcher caught it. The attacker compromised TanStack's CI pipeline via a fork-PR trust boundary, extracted a GitHub Actions OIDC token, and published directly to npm. The payload ran on `pnpm install`, harvested every credential reachable from the install host (AWS, GCP, Kubernetes, Vault, `~/.npmrc`, GitHub tokens, SSH keys), and exfiltrated them over an encrypted channel.

**This is directly relevant to our stack.** We depend on TanStack Query (`@tanstack/react-query`) for server-state management. We also pull in hundreds of transitive dependencies via Next.js, React, tRPC, Drizzle ORM, Better Auth, Zod, and Radix UI. Any one of those dependency trees is an equivalent attack surface.

The pattern is not new — earlier incidents include the "Shai-Hulud" worm and the chalk/debug crypto-clipper — and frequency is increasing. The gap between a malicious version going live and it landing in `node_modules` is now measured in minutes.

---

## Threat Model

Supply chain poisoning reaches us through three distinct moments. Controls must exist at all three.

**1. Resolution** — when a version is chosen and written into `pnpm-lock.yaml`. This happens on `pnpm add <pkg>`, `pnpm update`, or any fresh install without a lockfile. A brand-new malicious version slips in here.

**2. Installation** — when packages are unpacked and lifecycle scripts (`preinstall` / `install` / `postinstall`) run. This is the detonation step. Every major incident in this category has executed via install scripts.

**3. Execution environment** — if something does run, what can it reach? Our CI runners hold registry tokens, cloud credentials, and potentially Docker socket access. That is the exfiltration prize.

---

## Required Controls

### 1. Commit the lockfile and use `--frozen-lockfile` everywhere

**Why it matters:** `pnpm install --frozen-lockfile` installs exactly what is pinned in `pnpm-lock.yaml`, verifies every package against its integrity hash, and never re-resolves. It fails loudly if the lockfile has drifted rather than silently rewriting it. Everyone who was running a bare `pnpm install` during the TanStack twenty-minute window got burned. Anyone whose CI ran with a frozen lockfile against a pre-compromise `pnpm-lock.yaml` was untouched.

**Action items:**

- `pnpm-lock.yaml` must be committed. No exceptions.
- All CI jobs must use `pnpm install --frozen-lockfile`, never bare `pnpm install`.
- All Dockerfiles must use `pnpm install --frozen-lockfile`.
- Treat any diff to `pnpm-lock.yaml` in a PR as production code, because it is.

```dockerfile
# Correct
RUN pnpm install --frozen-lockfile

# Wrong — re-resolves on every build
RUN pnpm install
```

Alternatively, set this permanently in `.npmrc` (pnpm reads `.npmrc`):

```ini
# .npmrc
frozen-lockfile=true
```

With that in place, a bare `pnpm install` in any context will behave as if `--frozen-lockfile` was passed, and developers who forget the flag are still protected.

---

### 2. Install cooldown via `minimumReleaseAge`

**Why it matters:** A one-day cooldown means that when a developer runs `pnpm update` the morning after a compromise, pnpm will not pick the poisoned version. The community and npm's security team have a head start. This is the cheapest meaningful control available.

pnpm 10.16+ supports `minimumReleaseAge` natively. At 10.33.0 we have full support.

**Action items:**

Add to `.npmrc` at the repo root:

```ini
# .npmrc
# Supply-chain cooldown: refuse to resolve packages published less than 1 day ago.
# Increase to 3d or 7d for higher assurance at the cost of delayed adoption.
minimum-release-age=1d
```

pnpm also supports `minimumReleaseAgeExclude` for packages that legitimately need same-day resolution (internal packages, specific trusted packages):

```ini
# .npmrc
minimum-release-age=1d
# Example: exclude an internal scoped package from the cooldown
# minimum-release-age-exclude=@your-org/internal-pkg
```

Additional notes:

- This has **no effect on `--frozen-lockfile` installs** — which never re-resolve. The protection applies at the moment a version enters `pnpm-lock.yaml` (developer machines, any CI step running `pnpm update`).
- **Dependabot and Renovate do their own resolution** and bypass this setting. Configure matching cooldowns there:
  - Renovate: set `minimumReleaseAge` in `renovate.json` (e.g. `"minimumReleaseAge": "1 day"`).
  - Dependabot: add a `cooldown:` block to `dependabot.yml` (`default-days: 1`, with per-semver overrides).
- **Disable auto-merge on dependency PRs.** A cooldown is meaningless if Renovate opens and merges a PR for a version published an hour ago.

---

### 3. Block install script execution in CI and Docker (`--ignore-scripts`)

**Why it matters:** This is the control that stops detonation. By default pnpm executes `preinstall` / `install` / `postinstall` scripts for every package in the tree — direct and transitive. In a CI runner or Docker build, that machine holds registry tokens, cloud credentials, and potentially the Docker socket. `--ignore-scripts` removes that execution surface entirely for controlled builds.

**Action items:**

Apply `--ignore-scripts` at the command level in Dockerfiles and CI install steps. Do not set `ignore-scripts=true` in `.npmrc` globally — that would break developer machines (Playwright browser downloads, MSW service worker copy, native module builds).

```dockerfile
# Dockerfile
COPY package.json pnpm-lock.yaml ./
# Neutralise the most common supply-chain detonation vector.
RUN pnpm install --frozen-lockfile --ignore-scripts
```

For packages that legitimately require a post-install build step, allow-list them with `pnpm rebuild`:

```dockerfile
# sharp is used for Next.js image optimisation — rebuild only this package's scripts.
RUN pnpm install --frozen-lockfile --ignore-scripts && pnpm rebuild sharp
```

This reduces the attack surface from "every dependency in the tree can execute code on our build server" to "only the packages we have explicitly named."

**Stack-specific rebuild table:**

| Package                      | Needs rebuild?             | Notes                              |
| ---------------------------- | -------------------------- | ---------------------------------- |
| `sharp`                      | Yes (`pnpm rebuild sharp`) | Next.js image optimisation         |
| `better-sqlite3`             | Yes if used                | Native addon                       |
| `@img/sharp-linux-x64` etc.  | No                         | Pre-built binary, no script needed |
| `@esbuild/linux-x64` etc.    | No                         | Pre-built binary, no script needed |
| `drizzle-orm`, `tRPC`, `zod` | No                         | Pure JS                            |
| `better-auth`                | No                         | Pure JS                            |
| `@tanstack/react-query`      | No                         | Pure JS                            |

---

### 4. Digest-pin base images in Dockerfiles

**Why it matters:** `FROM node:24-alpine` is a mutable tag; it resolves to a different image every time it changes upstream. Pinning by digest makes the base image as reproducible as the lockfile.

**Action items:**

Replace floating tags with digest-pinned references:

```dockerfile
# Before — mutable
FROM node:24-alpine

# After — pinned
FROM node:24-alpine@sha256:<current-digest>
```

Configure Renovate or Dependabot to manage the digest so updates still happen deliberately. The digest is not set-and-forget; it must be rotated, but on your schedule.

---

### 5. Protect dependency files with CODEOWNERS and run `pnpm audit` in CI

**Why it matters:** `minimum-release-age` stops pnpm from picking a bad version automatically. Code review stops someone from handing you one directly via a PR that modifies `pnpm-lock.yaml`. `pnpm audit` catches the long tail of known-vulnerable packages (it does not protect against zero-day malicious publishes, but it handles everything that has been reported).

**Action items:**

Add to `.github/CODEOWNERS`:

```
package.json       @your-team/platform
pnpm-lock.yaml     @your-team/platform
.npmrc             @your-team/platform
```

Add to CI pipeline (after `pnpm install --frozen-lockfile --ignore-scripts`):

```yaml
- name: Audit dependencies
  run: pnpm audit --audit-level high
```

Fail the build on `high` or `critical` advisories. Do not suppress findings without a tracked justification.

---

### 6. Minimise CI token scope and egress

**Why it matters:** The TanStack attacker's payload exfiltrated credentials to external hosts. If the build runner's outbound network is unrestricted and its tokens are over-scoped, a single successful detonation becomes a full credential harvest.

**Action items:**

- CI jobs should hold only the tokens required for that job. No long-lived cloud credentials in a general-purpose build job.
- Review whether any pipeline step is triggered by fork PRs in a privileged context (`pull_request_target` in GitHub Actions). Fork code must never run in a job with production secrets.
- Consider restricting outbound network during `pnpm install` steps to known registries only. The TanStack payload required external egress to exfiltrate; egress filtering kills that path.
- Rotate tokens on a schedule. Know the rotation checklist before you need it at 2 a.m.

---

## Incident Response Checklist

If a compromised version is found to have been installed on any machine or runner:

1. Treat the host as compromised. Do not attempt to remediate in place.
2. Rotate immediately: npm/pnpm tokens, GitHub tokens, cloud keys (AWS, GCP), Kubernetes/Vault tokens, SSH keys reachable from that machine.
3. Audit `~/.npmrc`, `~/.ssh`, environment variables, and any credential files readable from the install context.
4. Check whether the package also republished itself into other packages that machine maintains.
5. File an internal incident report and notify affected teams.

---

## What This Does and Does Not Buy Us

| Control                                          | Protects against                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `--frozen-lockfile` + committed `pnpm-lock.yaml` | Installs the versions we reviewed, not whatever is newest at build time                                |
| `minimum-release-age=1d`                         | Shrinks the window a malicious version has to enter the lockfile; most attacks are caught within hours |
| `--ignore-scripts` in CI/Docker                  | Neutralises the primary detonation mechanism for CI and container builds                               |
| Digest-pinned base images                        | Closes the base-image substitution vector the TanStack attacker used                                   |
| CODEOWNERS + `pnpm audit`                        | Requires human review of dependency changes; catches known advisories                                  |
| Token scope + egress limits                      | Reduces blast radius if something does execute                                                         |

**What it does not prevent:**

- A malicious `pnpm-lock.yaml` committed directly to the repo — that is the responsibility of code review and protected branches.
- A compromise that stays hidden longer than the cooldown window — increase `minimum-release-age` and do not assume fast public disclosure.
- Developer machines running bare `pnpm install` without `--ignore-scripts` — lower risk than CI, but developers should be aware.

---

## Quick-Start: 30-Minute Implementation

Priority order for immediate action:

1. Confirm `pnpm-lock.yaml` is committed; add `frozen-lockfile=true` to `.npmrc`; update CI/Dockerfiles to `pnpm install --frozen-lockfile`.
2. Add `minimum-release-age=1d` to the committed `.npmrc`.
3. Add `--ignore-scripts` to the `pnpm install` step in Dockerfiles and CI; add `pnpm rebuild sharp` if Next.js image optimisation is in use.
4. Digest-pin all base images.
5. Add `pnpm audit --audit-level high` to CI and protect dependency files with CODEOWNERS.
6. Configure a matching cooldown in Renovate (`minimumReleaseAge`) or Dependabot; disable auto-merge on dependency PRs.

---

_Issued by platform engineering. Review and acknowledgement required from all engineers with merge access to the monorepo._
