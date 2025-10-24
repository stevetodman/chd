import {
  PERMISSIBLE_LICENSES,
  collectDependencies,
  validateLicenses,
  REPO_ROOT,
} from './lib/license-utils.mjs';

function formatDependency(dependency) {
  const locationDetails = dependency.sources
    .map((source) => `${source.lockfile}:${source.locator}`)
    .join(', ');
  return `${dependency.identifier} (${dependency.license ?? 'no license'}) [${locationDetails}]`;
}

async function main() {
  const dependencies = await collectDependencies(REPO_ROOT);
  const { missing, disallowed } = validateLicenses(dependencies);

  if (missing.length === 0 && disallowed.length === 0) {
    console.log(`All ${dependencies.size} dependencies comply with the license policy.`);
    console.log(`Permissible licenses: ${Array.from(PERMISSIBLE_LICENSES).join(', ')}`);
    return;
  }

  if (missing.length > 0) {
    console.error('The following dependencies are missing license metadata:');
    for (const dependency of missing) {
      console.error(`  - ${formatDependency(dependency)}`);
    }
  }

  if (disallowed.length > 0) {
    console.error('The following dependencies use licenses that are not in the permissible set:');
    for (const dependency of disallowed) {
      console.error(`  - ${formatDependency(dependency)}`);
    }
    console.error('Permissible licenses are:');
    for (const license of PERMISSIBLE_LICENSES) {
      console.error(`  - ${license}`);
    }
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error('License compliance check failed:', error);
  process.exitCode = 1;
});
