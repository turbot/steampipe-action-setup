const core = require('@actions/core');
const {
  checkPlatform,
  getSteampipeVersions,
  getVersionFromSpec,
  installSteampipe,
  installSteampipePlugins,
  configureSteampipePlugins,
} = require('./installer');

async function run() {
  try {
    checkPlatform();
    const version = core.getInput('steampipe-version', { required: false });
    const plugins = JSON.parse(core.getInput('steampipe-plugins') || '{}');

    const steampipeVersions = await getSteampipeVersions();
    const versionToInstall = getVersionFromSpec(version, steampipeVersions);

    if (!versionToInstall) {
      throw new Error(`Unable to find Steampipe version '${version}'.`);
    }

    const steampipePath = await installSteampipe(versionToInstall);
    core.addPath(steampipePath);

    await installSteampipePlugins(plugins);
    await configureSteampipePlugins(plugins);

    core.setOutput('steampipe-version', versionToInstall);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
