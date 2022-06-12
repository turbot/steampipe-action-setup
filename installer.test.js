const { checkPlatform, getVersionFromSpec } = require('./installer');

describe('checkPlatform', () => {
  const workingPlatforms = ['linux', 'darwin'];
  const notWorkingPlatforms = ['aix','freebsd', 'openbsd', 'sunos', 'win32'];
  const workingArchs = ['x64', 'arm64'];
  const notWorkingArchs = ['arm', 'ia32', 'mips','mipsel', 'ppc', 'ppc64', 's390', 's390x'];

  workingPlatforms.forEach((platform) => {
    workingArchs.forEach((arch) => {
      test(`works on ${platform}/${arch}`, () => {
        expect(() => {
          checkPlatform({
            platform,
            arch
          });
        }).not.toThrow();
      });
    });

    notWorkingArchs.forEach((arch) => {
      test(`don't work on ${platform}/${arch}`, () => {
        expect(() => {
          checkPlatform({
            platform,
            arch
          });
        }).toThrow('francois2metz/setup-steampipe only supports linux and darwin on x64 and arm64 at this time');
      });
    });
  });

  notWorkingPlatforms.forEach((platform) => {
    workingArchs.forEach((arch) => {
      test(`don't work on ${platform}/${arch}`, () => {
        expect(() => {
          checkPlatform({
            platform,
            arch
          });
        }).toThrow('francois2metz/setup-steampipe only supports linux and darwin on x64 and arm64 at this time');
      });
    });
  });
});

describe('getVersionFromSpec', () => {
  const steampipeVersions = [
    'v0.10.0',        'v0.10.0-beta.0', 'v0.10.0-beta.1',
    'v0.10.0-beta.2', 'v0.10.0-beta.4', 'v0.10.0-beta.5',
    'v0.10.0-dev.1',  'v0.10.0-dev.2',  'v0.11.0',
    'v0.11.0-dev.0',  'v0.11.0-dev.1',  'v0.11.0-dev.2',
    'v0.11.0-dev.3',  'v0.11.0-dev.4',  'v0.11.0-dev.5',
    'v0.11.0-rc.0',   'v0.11.0-rc.1',   'v0.11.0-rc.2',
    'v0.11.1',        'v0.11.2',        'v0.12.0',
    'v0.12.0-rc.0',   'v0.12.0-rc.1',   'v0.12.1',
  ];

  it('returns the version', () => {
    expect(getVersionFromSpec('v0.10.0', steampipeVersions)).toEqual('v0.10.0');
    expect(getVersionFromSpec('latest', steampipeVersions)).toEqual('v0.12.1');
    expect(getVersionFromSpec('^v0.11', steampipeVersions)).toEqual('v0.11.2');
    expect(getVersionFromSpec('^v0.13', steampipeVersions)).toEqual('');
  });
});
