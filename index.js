const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const path = require('path');
const {
  checkPlatform,
  getSteampipeVersions,
  getVersionFromSpec
} = require('./installer');

async function run() {
  try {
    checkPlatform();
    const version = core.getInput('steampipe-version', { required: false });

    const steampipeVersions = await getSteampipeVersions();
    const versionToInstall = getVersionFromSpec(version, steampipeVersions);

    if (!versionToInstall) {
      throw new Error(`Unable to find Steampipe version '${version}'.`);
    }

    // check cache
    let toolPath = tc.find('steampipe', versionToInstall, process.arch);

    if (toolPath) {
      core.info(`Found in cache @ ${toolPath}`);
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

      const steampipeArchivePath = await tc.downloadTool(`https://github.com/turbot/steampipe/releases/download/${versionToInstall}/steampipe_${target}`);
      const extractFolder = await (async () => {
        if (process.platform === 'linux') {
          return tc.extractTar(steampipeArchivePath);
        } else {
          return tc.extractZip(steampipeArchivePath);
        }
      })();

      toolPath = await tc.cacheDir(extractFolder, 'steampipe', versionToInstall, process.arch);
    }

    core.addPath(toolPath);

    core.setOutput('steampipe-version', versionToInstall);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
