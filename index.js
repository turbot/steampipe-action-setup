const core = require("@actions/core");
const exec = require("@actions/exec");
const {
  checkPlatform,
  configureSteampipePlugins,
  createDefaultSpc,
  deletePluginConfigs,
  getPluginsToInstall,
  getSteampipeVersions,
  getVersionFromSpec,
  installSteampipe,
  installSteampipePlugins,
  writePluginConnections,
} = require("./installer");

async function run() {
  try {
    checkPlatform();

    const version = core.getInput("steampipe-version", { required: false });
    const pluginConns = core.getInput("plugin-connections");
    const plugins = JSON.parse(core.getInput("steampipe-plugins") || "{}");
    var pluginsToInstall, uniquePluginsToInstall;

    // steampipe-plugins input is deprecated, so error if both inputs are given
    if (pluginConns != "" && Object.keys(plugins).length > 0) {
      throw new Error(
        `Cannot use steampipe-plugins and plugin-connections inputs together`
      );
    }

    const steampipeVersions = await getSteampipeVersions();
    const versionToInstall = getVersionFromSpec(version, steampipeVersions);

    if (!versionToInstall) {
      throw new Error(`Unable to find Steampipe version '${version}'.`);
    }

    core.info(`Steampipe CLI version: ${versionToInstall}`);
    const steampipePath = await installSteampipe(versionToInstall);

    core.addPath(steampipePath);
    core.debug(`Added Steampipe CLI to path`);

    // Create default.spc with "update_check = false" before initialization
    // to prevent the CLI update check too
    await createDefaultSpc();

    // Run a simple query to start the Steampipe service and initialize the DB
    core.debug(`Executing query to test Steampipe initialization`);
    // TODO: If silent is true for less noise, will it still show errors?
    const options = { silent: false };
    await exec.exec("steampipe", ["query", "select true as initialized"], options);

    // Plugin installation and configuration is optional
    if (pluginConns != "") {
      pluginsToInstall = getPluginsToInstall(pluginConns);
      uniquePluginsToInstall = [...new Set(pluginsToInstall)];
      await installSteampipePlugins(uniquePluginsToInstall, versionToInstall);
      // Remove default spc files created by plugin installation
      await deletePluginConfigs();
      await writePluginConnections(pluginConns);
    }

    if (Object.keys(plugins).length > 0) {
      pluginsToInstall = Object.keys(plugins);
      uniquePluginsToInstall = [...new Set(pluginsToInstall)];
      await installSteampipePlugins(uniquePluginsToInstall, versionToInstall);
      await configureSteampipePlugins(plugins);
    }

    core.setOutput("steampipe-version", versionToInstall);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
