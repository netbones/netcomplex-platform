# Migrating from v10 to v11

URL: https://pnpm.io/migration

Version: 11.x

pnpm v11 introduces several breaking changes to how configuration is read and which settings are available. Most config changes are mechanical and can be applied by a codemod; the remainder require human attention. pnpm prints a pointer to this page when `pnpm self-update 11` is run from a v10 install.

## Run the codemod

```sh
cd /path/to/your/project
pnpx codemod run pnpm-v10-to-v11
# or
pnpm add --global codemod
codemod run pnpm-v10-to-v11
```

The codemod applies the following automatically:

- **Moves settings out of `package.json#pnpm` into `pnpm-workspace.yaml`** . In v11, pnpm no longer reads configuration from the `pnpm` field in `package.json` .
- **Splits `.npmrc` into auth/registry vs. everything else** . v11 only reads auth and registry settings from `.npmrc` . Every other setting ( `hoist-pattern` , `node-linker` , `save-exact` , …) is moved into `pnpm-workspace.yaml` with a camelCase key. Per-subproject `.npmrc` files land under `packageConfigs["<project-name>"]` .
- **Consolidates build-dependency settings into `allowBuilds`** . `onlyBuiltDependencies` , `neverBuiltDependencies` , `ignoredBuiltDependencies` , and `onlyBuiltDependenciesFile` are merged into a single `allowBuilds` map ( `{ name: true | false }` ).
- **Replaces the package-manager strictness settings with `pmOnFail`** . `managePackageManagerVersions` , `packageManagerStrict` , and `packageManagerStrictVersion` are collapsed into one `pmOnFail: download | ignore | warn | error` setting.
- **Renames**`allowNonAppliedPatches` → `allowUnusedPatches` , and `auditConfig.ignoreCves` → `auditConfig.ignoreGhsas` (the key is renamed; CVE IDs still need to be converted to GHSA IDs manually — see below).
- **Converts `useNodeVersion`** into a `devEngines.runtime` entry on the root `package.json` .
- **Bumps `packageManager`** in `package.json` to the target pnpm v11 version.

## Manual follow-ups

The following changes are not automatable and need human attention:

- **CVE → GHSA** . `auditConfig.ignoreCves` was renamed to `auditConfig.ignoreGhsas` . Replace each `CVE-YYYY-NNNNN` entry with the matching `GHSA-xxxx-xxxx-xxxx` ID (visible in the "More info" column of `pnpm audit` output).
- **`ignorePatchFailures`** has been removed. Failed patches now always throw; fix the patch or remove the dependency.
- **`executionEnv.nodeVersion`** in a workspace subpackage's `package.json#pnpm` is removed. Declare the runtime in that subpackage's `devEngines.runtime` instead.
- **`npm_config_*` environment variables** are no longer read. Rename them to `pnpm_config_*` wherever they are set (CI configs, shell profiles, Docker images).
- **`pnpm link <pkg-name>`** no longer resolves packages from the global store. Use a relative or absolute path ( `pnpm link ./foo` ).
- **`pnpm install -g`** (with no arguments) is no longer supported. Use `pnpm add -g <pkg>` instead.
- **`pnpm server`** has been removed with no replacement.
- **Script names shadow built-in commands** . If your `package.json` defines a script named `clean` , `setup` , `deploy` , or `rebuild` , `pnpm <name>` now runs the script instead of the built-in command. Use [`pnpm pm <name>`](/cli/pm) to force the built-in.
  For the full list of breaking changes, see the [v11 changelog](https://github.com/pnpm/pnpm/blob/main/pnpm/CHANGELOG.md) .

if (typeof \_bsa !== 'undefined' && \_bsa) { \_bsa.init('custom', 'CWYI4K7E', 'placement:pnpmio', { target: '#bsa-custom-01', template: `<a href="##link##" class="native-banner" style="background: ##backgroundColor##" rel="sponsored noopener" target="_blank" title="##company## — ##tagline##"> <img class="native-img" width="125" src="##logo##" /> <div class="native-main"> <div class="native-details" style=" color: ##textColor##; border-left: solid 1px ##textColor##; "> <span class="native-desc">##description##</span> </div> <span class="native-cta" style=" color: ##ctaTextColor##; background-color: ##ctaBackgroundColor##; ">##callToAction##</span> </div> </a>`, }); }
