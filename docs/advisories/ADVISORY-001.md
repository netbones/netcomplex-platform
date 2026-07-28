---
title: ADVISORY.md
status: current
reviewed: 2026-07-28
tags: [advisory, architecture]
audience: developer
---

# ADVISORY.md

## Purpose

This document provides guidance for agents diagnosing React, Radix UI, Turbopack, Next.js, and monorepo dependency-resolution issues.

The goal is to prevent agents from applying incorrect aliasing fixes before identifying the actual root cause.

---

# React Resolution Advisory

## Background

Modern Next.js internally resolves React through compiled packages located under:

```text
next/dist/compiled/react
next/dist/compiled/react-dom
```

These may appear in stack traces, module graphs, or Turbopack diagnostics as:

```text
react-builtin
react-dom-builtin
```

This behavior is normal.

The appearance of `react-builtin` is NOT itself evidence of a problem.

---

# Do Not Assume Alias Problems

Before modifying:

```ts
resolveAlias;
webpack.resolve.alias;
turbopack.resolveAlias;
```

an agent MUST verify whether the issue is actually caused by:

1. Multiple React installations
2. Incorrect peerDependencies
3. Monorepo package boundaries
4. Bundled React copies
5. Radix peer dependency mismatches
6. Missing transpilePackages configuration

These causes are significantly more common than Next.js resolver failures.

---

# Diagnostic Checklist

## Step 1: Verify Single React Installation

Run:

```bash
pnpm why react
pnpm why react-dom
```

or

```bash
npm ls react
npm ls react-dom
```

Expected result:

```text
react
└── one version
```

Red flags:

```text
react@19.x
react@18.x
```

or multiple installation trees.

If multiple versions exist:

STOP.

Resolve duplication before attempting aliasing.

---

## Step 2: Inspect Workspace Packages

For every internal package:

```json
{
  "name": "@workspace/ui"
}
```

verify:

```json
{
  "peerDependencies": {
    "react": "^19",
    "react-dom": "^19"
  }
}
```

Preferred:

```json
{
  "peerDependencies": {
    "react": "^19",
    "react-dom": "^19"
  }
}
```

Avoid:

```json
{
  "dependencies": {
    "react": "^19",
    "react-dom": "^19"
  }
}
```

unless the package is a standalone application.

---

## Step 3: Verify React Is Not Bundled

Check build configuration.

React should typically be externalized.

Examples:

- tsup
- rollup
- vite library mode
- unbuild

must not bundle React.

Example:

```ts
external: ['react', 'react-dom'];
```

---

## Step 4: Verify Next.js Workspace Configuration

If consuming workspace packages:

```ts
const nextConfig = {
  transpilePackages: ['@workspace/ui', '@workspace/shared'],
};
```

Ensure all source packages consumed by Next.js are listed.

---

## Step 5: Check Radix Versions

Verify all Radix packages use compatible versions.

Example:

```bash
pnpm why @radix-ui/react-dialog
pnpm why @radix-ui/react-slot
pnpm why @radix-ui/react-compose-refs
```

Mixed major versions should be treated as suspicious.

---

# Resolver Guidance

## Incorrect Fix

The following is ineffective:

```ts
resolveAlias: {
  react: 'react';
}
```

Reason:

The specifier remains unchanged and Next.js may still resolve through its internal compiled React.

---

## Only Use Aliasing As A Last Resort

Aliasing should be considered only after:

- duplicate React eliminated
- peerDependencies verified
- transpilePackages configured
- package graph validated

---

## If A Forced Alias Is Required

Use filesystem paths:

```ts
import path from "path";

resolveAlias: {
  react: path.resolve("./node_modules/react"),
  "react-dom": path.resolve("./node_modules/react-dom")
}
```

Only apply if diagnostics prove React resolution is incorrect.

---

# Known Good Architecture

Workspace package:

```json
{
  "peerDependencies": {
    "react": "^19",
    "react-dom": "^19"
  }
}
```

Next.js application:

```ts
const nextConfig = {
  transpilePackages: ['@workspace/ui'],
};
```

Package manager:

```bash
pnpm install
pnpm dedupe
```

Verification:

```bash
pnpm why react
```

Result:

```text
single React instance
```

---

# Agent Decision Tree

When encountering:

```text
react-builtin
next/dist/compiled/react
Invalid hook call
Cannot read properties of null (reading useContext)
Radix rendering failures
```

Follow this order:

1. Verify single React version.
2. Verify peerDependencies.
3. Verify React is not bundled.
4. Verify transpilePackages.
5. Verify Radix version alignment.
6. Investigate package manager deduplication.
7. Only then investigate resolver aliasing.
8. Only then apply filesystem-based aliases.

Never begin with alias modifications.
