# pnpm Vendored Dependencies

This directory contains all npm package tarballs needed to build the frontend. This makes the frontend build **hermetic** - no network access is required after cloning the repository.

## How It Works

pnpm stores package content in a content-addressable store. By configuring `store-dir=.pnpm-store` in `.npmrc`, we keep this store inside the repository.

When you run `pnpm install --offline`, pnpm:

1. Reads the lockfile (`pnpm-lock.yaml`)
2. Links packages from this local store to `node_modules/`
3. Does NOT contact the npm registry

## Usage

```bash
# Regular install (prefers offline, falls back to network)
pnpm install

# Fully offline install (fails if packages missing from store)
pnpm install --offline
```

## Updating Dependencies

When you add or update a package:

```bash
pnpm add <package>        # Adds to store automatically
pnpm update <package>     # Updates and adds to store
pnpm fetch                # Explicitly fetch all lockfile packages to store
```

After updating, commit both `pnpm-lock.yaml` and `.pnpm-store/` together.

## Size

This store is ~192MB (compressed tarballs), similar to `node_modules/` size but:

- Contains exact package tarballs (reproducible)
- Enables fully offline builds
- Shared across all developers via git

## Why Vendor?

- **Hermetic builds**: Build works without npm registry access
- **Reproducibility**: Exact same packages every time
- **Speed**: No network latency on install
- **Reliability**: Not dependent on npm registry availability
