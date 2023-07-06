const core = require("@actions/core");
const exec = require("@actions/exec");
const {
  checkPlatform,
  deleteDefaultPluginConfigs,
  getPluginsToInstall,
  getSteampipeVersions,
  getVersionFromSpec,
  installSteampipe,
  installSteampipePlugins,
  configureSteampipePlugins,
  setupConnections,
} = require("./installer");

async function run() {
  try {
    checkPlatform();
    const version = core.getInput("steampipe-version", { required: false });
    const plugins = JSON.parse(core.getInput("steampipe-plugins") || "{}");
    const pluginConns = core.getInput("plugin-connections");
    var pluginsToInstall, uniquePluginsToInstall;

    if (pluginConns != "" && Object.keys(plugins).length > 0) {
      throw new Error(
        `Cannot use steampipe-plugins and plugin-connections inputs together`
      );
    }

    const steampipeVersions = await getSteampipeVersions();
    const versionToInstall = getVersionFromSpec(version, steampipeVersions);
    core.info(`Steampipe CLI version: ${versionToInstall}`);

    if (!versionToInstall) {
      throw new Error(`Unable to find Steampipe version '${version}'.`);
    }

    const steampipePath = await installSteampipe(versionToInstall);
    core.addPath(steampipePath);
    core.info(`Added Steampipe CLI to path`);

    // Run a simple query to start the Steampipe service and initialize the DB
    core.info(`Initializing Steampipe service`);
    await exec.exec("steampipe", ["query", "select 1"]);

    if (pluginConns != "") {
      pluginsToInstall = getPluginsToInstall(pluginConns);
      uniquePluginsToInstall = [...new Set(pluginsToInstall)];
      await installSteampipePlugins(uniquePluginsToInstall, versionToInstall);
      // Remove default spc files created by plugin installation
      await deleteDefaultPluginConfigs(uniquePluginsToInstall);
      await setupConnections(pluginConns);
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
