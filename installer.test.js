const exec = require("@actions/exec");
const fs = require("fs");
const {
  checkPlatform,
  getVersionFromSpec,
  installSteampipePlugins,
  configureSteampipePlugins,
  getSteampipePluginConfig,
} = require("./installer");

describe("checkPlatform", () => {
  const workingPlatforms = ["linux", "darwin"];
  const notWorkingPlatforms = ["aix", "freebsd", "openbsd", "sunos", "win32"];
  const workingArchs = ["x64", "arm64"];
  const notWorkingArchs = [
    "arm",
    "ia32",
    "mips",
    "mipsel",
    "ppc",
    "ppc64",
    "s390",
    "s390x",
  ];

  workingPlatforms.forEach((platform) => {
    workingArchs.forEach((arch) => {
      test(`works on ${platform}/${arch}`, () => {
        expect(() => {
          checkPlatform({
            platform,
            arch,
          });
        }).not.toThrow();
      });
    });

    notWorkingArchs.forEach((arch) => {
      test(`don't work on ${platform}/${arch}`, () => {
        expect(() => {
          checkPlatform({
            platform,
            arch,
          });
        }).toThrow(
          "turbot/steampipe-action-setup only supports linux and darwin on x64 and arm64 at this time"
        );
      });
    });
  });

  notWorkingPlatforms.forEach((platform) => {
    workingArchs.forEach((arch) => {
      test(`don't work on ${platform}/${arch}`, () => {
        expect(() => {
          checkPlatform({
            platform,
            arch,
          });
        }).toThrow(
          "turbot/steampipe-action-setup only supports linux and darwin on x64 and arm64 at this time"
        );
      });
    });
  });
});

describe("getVersionFromSpec", () => {
  const steampipeVersions = [
    "v0.10.0",
    "v0.10.0-beta.0",
    "v0.10.0-beta.1",
    "v0.10.0-beta.2",
    "v0.10.0-beta.4",
    "v0.10.0-beta.5",
    "v0.10.0-dev.1",
    "v0.10.0-dev.2",
    "v0.11.0",
    "v0.11.0-dev.0",
    "v0.11.0-dev.1",
    "v0.11.0-dev.2",
    "v0.11.0-dev.3",
    "v0.11.0-dev.4",
    "v0.11.0-dev.5",
    "v0.11.0-rc.0",
    "v0.11.0-rc.1",
    "v0.11.0-rc.2",
    "v0.11.1",
    "v0.11.2",
    "v0.12.0",
    "v0.12.0-rc.0",
    "v0.12.0-rc.1",
    "v0.12.1",
    "v0.13.0-rc.0",
  ];

  it("returns the version", () => {
    expect(getVersionFromSpec("", steampipeVersions)).toEqual("v0.12.1");
    expect(getVersionFromSpec("v0.10.0", steampipeVersions)).toEqual("v0.10.0");
    expect(getVersionFromSpec("latest", steampipeVersions)).toEqual("v0.12.1");
    expect(getVersionFromSpec("^v0.11", steampipeVersions)).toEqual("v0.11.2");
    expect(getVersionFromSpec("^v0.13", steampipeVersions)).toEqual("");
  });
});

jest.mock("@actions/exec");

describe("installSteampipePlugins", () => {
  beforeEach(() => {
    exec.exec = jest.fn();
  });

  it("install the specified plugins without --progress=false", async () => {
    await installSteampipePlugins(
      ["github", "francois2metz/scalingo"],
      "0.19.4"
    );
    expect(exec.exec).toHaveBeenCalledWith("steampipe", [
      "plugin",
      "install",
      "github",
      "francois2metz/scalingo",
    ]);
  });

  it("install the specified plugins with --progress=false", async () => {
    await installSteampipePlugins(
      ["github", "francois2metz/scalingo"],
      "0.20.8"
    );
    expect(exec.exec).toHaveBeenCalledWith("steampipe", [
      "plugin",
      "install",
      "github",
      "francois2metz/scalingo",
      "--progress=false",
    ]);
  });

  it("install nothing with undefined", async () => {
    await installSteampipePlugins(undefined, "0.20.8");
    expect(exec.exec).not.toHaveBeenCalled();
  });

  it("install nothing with empty plugins", async () => {
    await installSteampipePlugins([], "0.20.8");
    expect(exec.exec).not.toHaveBeenCalled();
  });
});

jest.mock("fs");

describe("configureSteampipePlugins", () => {
  beforeEach(() => {
    fs.promises.mkdir = jest.fn().mockResolvedValue();
    fs.promises.writeFile = jest.fn().mockResolvedValue();
    fs.promises.unlink = jest.fn().mockResolvedValue();
  });

  it("configure the plugins", async () => {
    await configureSteampipePlugins({
      github: { token: "test" },
      "francois2metz/scalingo": { token: "test2" },
    });
    expect(fs.promises.mkdir).toHaveBeenCalledWith(
      process.env.HOME + "/.steampipe/config",
      { recursive: true }
    );
    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      process.env.HOME + "/.steampipe/config/github.json",
      '{"connection":{"github":{"token":"test","plugin":"github"}}}'
    );
    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      process.env.HOME + "/.steampipe/config/scalingo.json",
      '{"connection":{"scalingo":{"token":"test2","plugin":"francois2metz/scalingo"}}}'
    );
    expect(fs.promises.unlink).toHaveBeenCalledWith(
      process.env.HOME + "/.steampipe/config/github.spc"
    );
    expect(fs.promises.unlink).toHaveBeenCalledWith(
      process.env.HOME + "/.steampipe/config/scalingo.spc"
    );
  });
});

describe("getSteampipePluginConfig", () => {
  it("returns the config for the plugin", async () => {
    const config = getSteampipePluginConfig("github", { token: "test" });
    expect(config).toEqual({
      connection: {
        github: {
          plugin: "github",
          token: "test",
        },
      },
    });
  });

  it("returns multiple connections per plugin", async () => {
    const config = getSteampipePluginConfig("github", [
      { token: "test" },
      { token: "test2" },
    ]);
    expect(config).toEqual({
      connection: {
        github1: {
          plugin: "github",
          token: "test",
        },
        github2: {
          plugin: "github",
          token: "test2",
        },
      },
    });
  });

  it("returns config for third party plugins", async () => {
    const config = await getSteampipePluginConfig("francois2metz/scalingo", {
      token: "test",
    });
    expect(config).toEqual({
      connection: {
        scalingo: {
          plugin: "francois2metz/scalingo",
          token: "test",
        },
      },
    });
  });

  it("returns config for plugins with specific version", async () => {
    const config = await getSteampipePluginConfig("github:0.1", {
      token: "test",
    });
    expect(config).toEqual({
      connection: {
        github: {
          plugin: "github:0.1",
          token: "test",
        },
      },
    });
  });
});
