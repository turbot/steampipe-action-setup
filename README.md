# setup-steampipe

<p align="center">
  <a href="https://github.com/francois2metz/setup-steampipe/actions"><img alt="steampipe-action status" src="https://github.com/francois2metz/setup-steampipe/workflows/units-test/badge.svg"></a>
</p>

This action install [Steampipe][].

## Inputs

## `steampipe-version`

The steampipe version range or exact version to install. Default `"latest"`.

## Outputs

## `steampipe-version`

The steampipe version installed.

## Example usage

```
uses: francois2metz/setup-steampipe@v1
with:
  steampipe-version: 'latest'
```

[steampipe]: https://github.com/turbot/steampipe/
