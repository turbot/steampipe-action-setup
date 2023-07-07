const core = require("@actions/core");
const exec = require("@actions/exec");
const hcl = require("js-hcl-parser");
const https = require("https");
const path = require("path");
const process = require("process");
const semver = require("semver");
const semverPrerelease = require("semver/functions/prerelease");
const tc = require("@actions/tool-cache");
const { promises: fsPromises } = require("fs");

const supportedPlatforms = ["linux", "darwin"];
const supportedArchs = ["x64", "arm64"];

function checkPlatform(p = process) {
  if (!supportedPlatforms.includes(p.platform)) {
    throw new Error(
      `turbot/steampipe-action-setup only supports ${supportedPlatforms.join(
        " and "
      )} on ${supportedArchs.join(" and ")} at this time`
    );
  }
  if (!supportedArchs.includes(p.arch)) {
    throw new Error(
      `turbot/steampipe-action-setup only supports ${supportedPlatforms.join(
        " and "
      )} on ${supportedArchs.join(" and ")} at this time`
    );
  }
}

// TODO: List all releases, not just the first 3 pages
async function getSteampipeVersions() {
  const resultJSONs = await get(
    "https://api.github.com/repos/turbot/steampipe/releases?per_page=100",
    [1, 2, 3]
  );
  const steampipeVersionListing = [];
  resultJSONs.forEach((resultJSON) => {
    JSON.parse(resultJSON)
      .map((x) => x.tag_name)
      .sort()
      .forEach((v) => steampipeVersionListing.push(v));
  });
  return steampipeVersionListing;
}

async function get(url0, pageIdxs) {
  function getPage(pageIdx) {
    return new Promise((resolve, reject) => {
      const url = new URL(url0);
      if (pageIdx !== null) {
        url.searchParams.append("page", pageIdx);
      }
      https
        .get(
          url,
          {
            headers: { "user-agent": "setup-steampipe" },
          },
          (res) => {
            let data = "";
            res.on("data", (chunk) => {
              data += chunk;
            });
            res.on("end", () => {
              if (res.statusCode >= 400 && res.statusCode <= 599) {
                reject(
                  new Error(
                    `Got ${res.statusCode} from ${url}. Exiting with error`
                  )
                );
              } else {
                resolve(data);
              }
            });
          }
        )
        .on("error", (err) => {
          reject(err);
        });
    });
  }
  let ret;
  if (pageIdxs[0] === null) {
    ret = getPage(null);
  } else {
    ret = Promise.all(pageIdxs.map((pageIdx) => getPage(pageIdx)));
  }
  return ret;
}

function getVersionFromSpec(versionSpec, versions) {
  let version = "";
  versions.sort((a, b) => {
    if (semver.gt(a, b)) {
      return 1;
    }
    return -1;
  });

  if (versionSpec === "latest") {
    core.info("Getting latest Steampipe CLI version");
    const filtered = versions.filter((version) => {
      return !semverPrerelease(version);
    });
    return filtered[filtered.length - 1];
  }

  for (let i = versions.length - 1; i >= 0; i--) {
    const potential = versions[i];
    const satisfied = semver.satisfies(potential, versionSpec);
    if (satisfied) {
      version = potential;
      break;
    }
  }

  if (version) {
    core.debug(`Matched Steampipe CLI version: ${version}`);
  } else {
    core.debug(`No matching Steampipe CLI version found for ${versionSpec}`);
  }

  return version;
}

async function installSteampipe(steampipeVersion) {
  const toolPath = tc.find("steampipe", steampipeVersion, process.arch);

  if (toolPath) {
    core.info(`Found in cache @ ${toolPath}`);
    return toolPath;
  } else {
    const targets = {
      linux: {
        x64: "linux_amd64.tar.gz",
        arm64: "linux_arm64.tar.gz",
      },
      darwin: {
        x64: "darwin_amd64.zip",
        arm64: "darwin_arm64.zip",
      },
    };
    const target = targets[process.platform][process.arch];

    const downloadUrl = `https://github.com/turbot/steampipe/releases/download/${steampipeVersion}/steampipe_${target}`;
    core.info(`Steampipe download URL: ${downloadUrl.toString()}`);

    const steampipeArchivePath = await tc.downloadTool(downloadUrl);
    const extractFolder = await (async () => {
      if (process.platform === "linux") {
        return tc.extractTar(steampipeArchivePath);
      } else {
        return tc.extractZip(steampipeArchivePath);
      }
    })();

    return await tc.cacheDir(
      extractFolder,
      "steampipe",
      steampipeVersion,
      process.arch
    );
  }
}

async function installSteampipePlugins(plugins, steampipeVersion) {
  if (!plugins || plugins.length == 0) {
    throw new Error("No plugins identified");
  }

  core.info(`Installing plugins: ${plugins}`);

  const args = ["plugin", "install", ...plugins];

  // The progress flag is only available >=0.20.0 and helps hide noisy progress
  // bars
  if (semver.satisfies(steampipeVersion, ">=0.20.0")) {
    args.push("--progress=false");
  }
  await exec.exec("steampipe", args);
}

/*
 * steampipe-plugins input related functions
 */

async function configureSteampipePlugins(plugins) {
  if (plugins && Object.keys(plugins).length > 0) {
    const baseConfigPath = path.join(process.env.HOME, ".steampipe", "config");

    await fsPromises.mkdir(baseConfigPath, { recursive: true });

    await Promise.all(
      Object.keys(plugins).map(async (plugin) => {
        const config = getSteampipePluginConfig(plugin, plugins[plugin]);

        await fsPromises.writeFile(
          path.join(baseConfigPath, getPluginShortName(plugin) + ".json"),
          JSON.stringify(config)
        );
        try {
          await fsPromises.unlink(
            path.join(baseConfigPath, getPluginShortName(plugin) + ".spc")
          );
        } catch (e) {
          // ignore error
        }
      })
    );
  }
}

function getPluginShortName(name) {
  return ((n) => n[n.length - 1].split(":")[0])(name.split("/"));
}

function getSteampipePluginConfig(name, config) {
  const shortName = getPluginShortName(name);
  if (Array.isArray(config)) {
    let index = 1;
    return {
      connection: config.reduce((memo, config) => {
        memo[`${shortName}${index++}`] = {
          ...config,
          plugin: name,
        };
        return memo;
      }, {}),
    };
  }
  return {
    connection: {
      [shortName]: {
        ...config,
        plugin: name,
      },
    },
  };
}

/*
 * plugin-connections input related functions
 */

function getPluginsToInstall(connections) {
  const configType = getConnConfigType(connections);

  let connHclParsed, connJsonParsed, connData;
  let pluginsToInstall = [];
  switch (configType) {
    /*
     * Sample JSON connection config:
     * {
     *   "connection": {
     *     "net": {
     *       "plugin": "net"
     *     },
     *     "net_2": {
     *       "plugin": "net"
     *     },
     *     "hackernews": {
     *       "plugin": "hackernews"
     *     }
     *   }
     * }
     */
    case "json":
      try {
        connJsonParsed = JSON.parse(connections);
        if (!Object.getOwnPropertyDescriptor(connJsonParsed, "connection")) {
          throw new Error(
            "Missing 'connection' key in plugin-connections input"
          );
        }

        connData = connJsonParsed["connection"];
        pluginsToInstall = Object.keys(connData).map((k) => connData[k].plugin);
      } catch (err) {
        core.warning("Failed to get plugins to install from JSON config");
        throw err;
      }
      break;

    /*
     * Sample HCL connection config:
     * connection "net" {
     *   plugin = "net"
     *   timeout = 3000
     * }
     * connection "net_2" {
     *   plugin = "net"
     *   timeout = 100
     * }
     * connection "hackernews" {
     *   plugin = "hackernews"
     * }
     */
    case "hcl":
      try {
        connHclParsed = hcl.parse(connections);
        connJsonParsed = JSON.parse(connHclParsed);

        if (!Object.getOwnPropertyDescriptor(connJsonParsed, "connection")) {
          throw new Error(
            "Missing 'connection' key in plugin-connections input"
          );
        }

        connData = connJsonParsed["connection"];

        /* Sample HCL to JSON connection config:
         * [{
         *  "net": [{
         *   "plugin": "net",
         *   "timeout": 3000
         *  }]
         * }, {
         * "net_2": [{
         *   "plugin": "net",
         *   "timeout": 100
         * }]
         * }, {
         * "hackernews": [{
         *   "plugin": "hackernews"
         *  }]
         * }]
         */
        for (const conn of connData) {
          for (const connName in conn) {
            const subArray = conn[connName];
            for (const connArgs of subArray) {
              const plugin = connArgs.plugin;
              pluginsToInstall.push(plugin);
            }
          }
        }
      } catch (err) {
        core.warning("Failed to get plugins to install from HCL config");
        throw err;
      }

      break;
    default:
      throw new Error("Unknown connection config format");
  }

  const uniquePluginsToInstall = [...new Set(pluginsToInstall)];
  if (uniquePluginsToInstall.length == 0) {
    throw new Error("No plugins specified in plugin-connections input");
  }

  return uniquePluginsToInstall;
}

async function deletePluginConfigs() {
  core.info("Deleting all files in ~/.steampipe/config/");
  let contents = await fsPromises.readdir(
    `${process.env.HOME}/.steampipe/config`
  );
  for (const entry of contents) {
    await fsPromises.unlink(`${process.env.HOME}/.steampipe/config/${entry}`);
  }
}

async function writePluginConnections(connections) {
  let configType = getConnConfigType(connections);
  let filePath = `${process.env.HOME}/.steampipe/config/connections`;
  let fileExtension;
  switch (configType) {
    case "json":
      fileExtension = ".json";
      break;
    case "hcl":
      fileExtension = ".spc";
      break;
    default:
      throw new Error("Unknown connection config format");
  }

  filePath += fileExtension;
  core.info(`Writing connections into ${filePath}`);
  await fsPromises.writeFile(filePath, connections);
}

function getConnConfigType(connections) {
  // Check for JSON instead of HCL first since the HCL parse method accepts
  // JSON strings
  try {
    JSON.parse(connections);
    return "json";
    // Ignore errors so we can check if it's HCL
  } catch (err) {
    // ignore error
  }

  try {
    hcl.parse(connections);
    return "hcl";
    // Ignore errors so we can return unknown type
  } catch (err) {
    // ignore error
  }

  // Not HCL or JSON
  return "unknown";
}

module.exports = {
  checkPlatform,
  configureSteampipePlugins,
  deletePluginConfigs,
  getPluginsToInstall,
  getSteampipePluginConfig,
  getSteampipeVersions,
  getVersionFromSpec,
  installSteampipe,
  installSteampipePlugins,
  writePluginConnections,
};
