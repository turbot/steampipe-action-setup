# setup-steampipe

<p align="center">
  <a href="https://github.com/francois2metz/setup-steampipe/actions"><img alt="steampipe-action status" src="https://github.com/francois2metz/setup-steampipe/workflows/units-test/badge.svg"></a>
</p>

This action install [Steampipe][] and optionally plugins.

## Inputs

## `steampipe-version`

The steampipe version range or exact version to install. Default `"latest"`.

## `steampipe-plugins`

Plugins with config to install and configure as JSON.

## Outputs

## `steampipe-version`

The steampipe version installed.

## Example usage

```
steps:
- uses: actions/checkout@v3
- uses: francois2metz/setup-steampipe@v1
  with:
    steampipe-version: 'latest'
    steampipe-plugins: |
      {
        "github": {
          "token": "${{ secrets.GITHUB_TOKEN }}"
        },
        "francois2metz/scalingo": [
          { "type": "aggregator",
             "connections": ["scalingo1", "scalingo2"] },
          { "token": "${{ secrets.SCALINGO_TOKEN }}",
            "regions": ["osc-fr1"] },
          { "token": "${{ secrets.SCALINGO_SECNUM_TOKEN }}",
            "regions": ["osc-fr1", osc-secnum-fr1"] }
        ]
      }
- name: Run checks
  id: checks
  continue-on-error: true
  run: steampipe check all --progress=false --export=results.md
- name: Output markdown to the step
  run: cat results.md >> $GITHUB_STEP_SUMMARY
- name: Exit
  if: ${{ steps.checks.outcome == 'failure' }}
  run: exit 1
```

[steampipe]: https://github.com/turbot/steampipe/
