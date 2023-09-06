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
