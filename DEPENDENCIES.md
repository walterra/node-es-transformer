# Dependency Audit

Last updated: 2026-02-13

## Security Audit

```bash
yarn audit
```

**Result:** ✅ **0 vulnerabilities found** (725 packages audited)

## Outdated Packages

```bash
yarn outdated
```

### Production Dependencies

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| `cli-progress` | 3.12.0 | 3.12.0 | ✅ Up to date |
| `es8` | 8.19.1 | exotic | ✅ Using aliased package, up to date |
| `es9` | 9.3.1 | exotic | ✅ Using aliased package, up to date |
| `event-stream` | 3.3.5 | 4.0.1 | ⚠️ Intentionally locked to 3.3.4 for [security reasons](https://github.com/dominictarr/event-stream/issues/116) |
| `glob` | 7.2.3 | 13.0.3 | ⚠️ Major update available (v7 → v13) |
| `split2` | 4.2.0 | 4.2.0 | ✅ Up to date |

### Development Dependencies

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| `eslint` | 8.57.1 | 10.0.0 | ⚠️ Intentionally on v8 for .eslintrc compatibility |
| `eslint-config-prettier` | 9.1.2 | 10.1.8 | ℹ️ Major update available |
| `eslint-plugin-import` | 2.31.0 | 2.32.0 | ℹ️ Patch update available |
| `eslint-plugin-jest` | 28.14.0 | 29.14.0 | ℹ️ Major update available |
| `eslint-plugin-prettier` | 3.4.1 | 5.5.5 | ℹ️ Major update available |
| `jest` | 29.7.0 | 30.2.0 | ℹ️ Major update available |
| `prettier` | 2.8.8 | 3.8.1 | ℹ️ Major update available |
| `rollup` | 4.29.1 | 4.57.1 | ℹ️ Patch update available |

**Other dev dependencies:** Up to date

## Recommendations

### High Priority

**None** - No security vulnerabilities and no critical updates needed.

### Medium Priority

1. **Update `glob` to v13** (production dependency)
   - Current: 7.2.3
   - Latest: 13.0.3
   - Impact: File wildcard functionality (used in file ingestion)
   - Risk: Breaking changes in API
   - Action: See [issue #30](https://github.com/walterra/node-es-transformer/issues/30)

### Low Priority

2. **Update ESLint ecosystem** (dev dependencies)
   - ESLint: 8.57.1 → 10.0.0 (requires migrating to flat config)
   - eslint-config-prettier: 9.1.2 → 10.1.8
   - eslint-plugin-prettier: 3.4.1 → 5.5.5
   - eslint-plugin-jest: 28.14.0 → 29.14.0
   - Action: Consider when moving to ESLint flat config

3. **Update Prettier to v3** (dev dependency)
   - Current: 2.8.8
   - Latest: 3.8.1
   - Impact: Code formatting (may reformat existing code)
   - Action: Test in separate PR, expect formatting changes

4. **Update Jest to v30** (dev dependency)
   - Current: 29.7.0
   - Latest: 30.2.0
   - Impact: Test runner
   - Action: Review breaking changes, update if needed

5. **Update Rollup** (dev dependency)
   - Current: 4.29.1
   - Latest: 4.57.1
   - Impact: Build system
   - Action: Safe to update (patch release)

## Intentionally Locked Packages

### event-stream @ 3.3.4

**Why:** Security issue in 3.3.6+ where a malicious actor gained publish rights and added malware. See [GitHub issue #116](https://github.com/dominictarr/event-stream/issues/116).

**Status:** 3.3.4 is safe. v4.x is clean but represents a major rewrite.

**Action:** Evaluate v4.x migration for future releases.

### eslint @ 8.x

**Why:** ESLint v9+ requires flat config format. Current project uses `.eslintrc` format.

**Status:** v8.57.1 is the last version supporting legacy config format.

**Action:** Migrate to flat config when time permits, then upgrade to v10+.

## Maintenance Schedule

**Frequency:** Run dependency audit quarterly or before major releases.

**Commands:**

```bash
# Check for vulnerabilities
yarn audit

# Check for outdated packages
yarn outdated

# Update packages (respecting semver ranges)
yarn upgrade

# Interactive upgrade (choose versions)
yarn upgrade-interactive
```

## Update Process

Before updating any dependency:

1. **Review changelog** for breaking changes
2. **Update in a separate branch**
3. **Run full test suite**:
   ```bash
   yarn build
   yarn test
   yarn test:cross-version
   yarn test:types
   yarn lint
   ```
4. **Test locally** with real data
5. **Create changeset** for the update
6. **Open PR** and wait for CI to pass

## Security Policy

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

**For production dependency vulnerabilities:**
1. Assess severity and exploitability
2. Create patch release ASAP
3. Document in CHANGELOG.md and security advisory
4. Notify users if action is required

**For dev dependency vulnerabilities:**
- Lower priority (doesn't affect published package)
- Update in next regular release
- Document in CHANGELOG.md

## Next Review

**Date:** 2026-05-13 (3 months)

**Action items:**
- [ ] Run `yarn audit`
- [ ] Run `yarn outdated`
- [ ] Evaluate `glob` v13 upgrade
- [ ] Update Rollup to latest 4.x
- [ ] Update this document
