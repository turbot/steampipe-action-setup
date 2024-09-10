## v1.5.2 [2024-09-10]

_Bug fixes_

- Fixed secret references for AWS creds in README.

_Dependencies_

- Bumped @actions/core from v0.10.0 to v0.10.1.
- Bumped @vercel/ncc from v0.38.0 to v0.38.1.
- Bumped actions/setup-node from 3 to 4. ([#95](https://github.com/turbot/steampipe-action-setup/pull/95))
- Bumped actions/upload-artifact from 3 to 4. ([#100](https://github.com/turbot/steampipe-action-setup/pull/100))
- Bumped braces from 3.0.2 to 3.0.3. ([#109](https://github.com/turbot/steampipe-action-setup/pull/109))
- Bumped eslint from 8.52.0 to 8.56.0. ([#101](https://github.com/turbot/steampipe-action-setup/pull/101))
- Bumped eslint from 8.56.0 to 9.2.0. ([#108](https://github.com/turbot/steampipe-action-setup/pull/108))
- Bumped github/codeql-action from 2 to 3. ([#99](https://github.com/turbot/steampipe-action-setup/pull/99))
- Bumped semver from v7.5.4 to v7.6.3.
- Update to node v20 in action and check-dist workflow ([#104](https://github.com/turbot/steampipe-action-setup/pull/104)) (Thanks [@francois2metz](https://github.com/francois2metz) for the contribution!)

## v1.5.1 [2023-10-23]

_Dependencies_

- Bumped @babel/traverse from 7.22.17 to 7.23.2 to fix [GHSA-67hx-6x53-jw92](https://github.com/babel/babel/security/advisories/GHSA-67hx-6x53-jw92). ([#93](https://github.com/turbot/steampipe-action-setup/pull/93))
- Bumped @vercel/ncc from 0.36.1 to 0.38.0. ([#85](https://github.com/turbot/steampipe-action-setup/pull/85))
- Bumped eslint from 8.48.0 to 8.52.0. ([#94](https://github.com/turbot/steampipe-action-setup/pull/94))
- Bumped jest from 29.6.4 to 29.7.0. ([#88](https://github.com/turbot/steampipe-action-setup/pull/88))

## v1.5.0 [2023-09-06]

_Enhancements_

- The `config/default.spc` file is now created after CLI installation with CLI and plugin update checks disabled.
- Improved initialization query to be more clear.

## v1.4.0 [2023-07-07]

_What's new?_

- Added `plugin-connections` input, which accepts plugin connections as HCL or JSON. For more examples, please see [Examples](https://github.com/turbot/steampipe-action-setup#examples).
- Updated license to Apache 2.0 per [turbot/steampipe#488](https://github.com/turbot/steampipe/issues/488).
- Releases now use semantic versioning (starting with this release).

_Enhancements_

- Updated branding icon and color.

_Deprecated_

- Deprecated `steampipe-plugins` input, please use `plugin-connections` instead.
