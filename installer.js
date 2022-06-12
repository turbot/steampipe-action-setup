const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const process = require('process');
const semver = require('semver');
const https = require('https');
const { promises: fsPromises } = require('fs');
const path = require('path');
const semverPrerelease = require('semver/functions/prerelease');
const exec = require('@actions/exec');

const supportedPlatforms = ['linux', 'darwin'];
const supportedArchs = ['x64', 'arm64'];

function checkPlatform(p = process) {
  if (!supportedPlatforms.includes(p.platform)) {
    throw new Error(
      `francois2metz/setup-steampipe only supports ${supportedPlatforms.join(' and ')} on ${supportedArchs.join(' and ')} at this time`,
    )
  }
  if (!supportedArchs.includes(p.arch)) {
    throw new Error(
      `francois2metz/setup-steampipe only supports ${supportedPlatforms.join(' and ')} on ${supportedArchs.join(' and ')} at this time`,
    )
  }
}

async function getSteampipeVersions() {
  const resultJSONs = await get(
    'https://api.github.com/repos/turbot/steampipe/releases?per_page=100',
    [1, 2, 3],
  )
  const steampipeVersionListing = []
  resultJSONs.forEach((resultJSON) => {
    JSON.parse(resultJSON)
      .map((x) => x.tag_name)
      .sort()
      .forEach((v) => steampipeVersionListing.push(v))
  });
  return steampipeVersionListing;
}

async function get(url0, pageIdxs) {
  function getPage(pageIdx) {
    return new Promise((resolve, reject) => {
      const url = new URL(url0)
      if (pageIdx !== null) {
        url.searchParams.append('page', pageIdx)
      }
      https
        .get(
          url,
          {
            headers: { 'user-agent': 'setup-steampipe' },
          },
          (res) => {
            let data = ''
            res.on('data', (chunk) => {
              data += chunk
            })
            res.on('end', () => {
              if (res.statusCode >= 400 && res.statusCode <= 599) {
                reject(
                  new Error(
                    `Got ${res.statusCode} from ${url}. Exiting with error`,
                  ),
                )
              } else {
                resolve(data)
              }
            })
          },
        )
        .on('error', (err) => {
          reject(err)
        })
    })
  }
  let ret
  if (pageIdxs[0] === null) {
    ret = getPage(null)
  } else {
    ret = Promise.all(pageIdxs.map((pageIdx) => getPage(pageIdx)))
  }
  return ret
}

function getVersionFromSpec(versionSpec, versions) {
  let version = '';
  versions.sort((a, b) => {
    if (semver.gt(a, b)) {
      return 1;
    }
    return -1;
  });

  if (versionSpec === 'latest') {
    core.debug('Get latest version');
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
    core.debug(`matched: ${version}`);
  } else {
    core.debug('match not found');
  }

  return version;
}

async function installSteampipe(steampipeVersion) {
  const toolPath = tc.find('steampipe', steampipeVersion, process.arch);

  if (toolPath) {
    core.info(`Found in cache @ ${toolPath}`);
    return toolPath;
  } else {
    const targets = {
      linux: {
        x64: 'linux_amd64.tar.gz',
        arm64: 'linux_arm64.tar.gz',
      },
      darwin: {
        x64: 'darwin_amd64.zip',
	arm64: 'darwin_arm64.zip',
      }
    };
    const target = targets[process.platform][process.arch];

    const steampipeArchivePath = await tc.downloadTool(`https://github.com/turbot/steampipe/releases/download/${steampipeVersion}/steampipe_${target}`);
    const extractFolder = await (async () => {
      if (process.platform === 'linux') {
        return tc.extractTar(steampipeArchivePath);
      } else {
        return tc.extractZip(steampipeArchivePath);
      }
    })();

    return (await tc.cacheDir(extractFolder, 'steampipe', steampipeVersion, process.arch));
  }
}

async function installSteampipePlugins(plugins) {
  if (plugins && Object.keys(plugins).length > 0) {
    await exec.exec('steampipe', ['plugin', 'install', ...Object.keys(plugins)]);
  }
}

function getPluginShortName(name) {
  return ((n) => n[n.length -1].split(':')[0])(name.split('/'));
}

async function configureSteampipePlugins(plugins) {
  if (plugins && Object.keys(plugins).length > 0) {
    const baseConfigPath = path.join(process.env.HOME, '.steampipe', 'config');

    await fsPromises.mkdir(baseConfigPath, { recursive: true });

    await Promise.all(Object.keys(plugins).map(async (plugin) => {
      const config = getSteampipePluginConfig(plugin, plugins[plugin]);

      await fsPromises.writeFile(path.join(baseConfigPath, getPluginShortName(plugin) + '.json'), JSON.stringify(config));
      try {
        await fsPromises.unlink(path.join(baseConfigPath, getPluginShortName(plugin) + '.spc'));
      } catch (e) {}
    }));
  }
}

function getSteampipePluginConfig(name, config) {
  const shortName = getPluginShortName(name);
  if (Array.isArray(config)) {
    let index = 1;
    return {
      connection: config.reduce((memo, config) => {
        memo[`${shortName}${index++}`] = {
          ...config,
          plugin: name
        };
        return memo;
      }, {})
    };
  }
  return {
    connection: {
      [shortName]: {
        ...config,
        plugin: name
      }
    }
  };
}

module.exports = {
  checkPlatform,
  getSteampipeVersions,
  getVersionFromSpec,
  installSteampipe,
  installSteampipePlugins,
  configureSteampipePlugins,
  getSteampipePluginConfig,
};
