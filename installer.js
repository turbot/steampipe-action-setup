const core = require('@actions/core');
const process = require('process');
const semver = require('semver');
const https = require('https');

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
    core.debug('Get lastest version');
    return versions[versions.length - 1];
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


module.exports = {
  checkPlatform,
  getSteampipeVersions,
  getVersionFromSpec,
};
