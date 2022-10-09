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

Run local controls:

```yaml
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
              "connections": ["scalingo2", "scalingo3"] },
            { "token": "${{ secrets.SCALINGO_TOKEN }}",
              "regions": ["osc-fr1"] },
            { "token": "${{ secrets.SCALINGO_SECNUM_TOKEN }}",
              "regions": ["osc-fr1", "osc-secnum-fr1"] }
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

Run local controls and post failure on slack with a [custom control output template](https://steampipe.io/docs/develop/writing-control-output-templates).
The template must be installed before. It's available in the [templates directory](./templates).

```yaml
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
              "connections": ["scalingo2", "scalingo3"] },
            { "token": "${{ secrets.SCALINGO_TOKEN }}",
              "regions": ["osc-fr1"] },
            { "token": "${{ secrets.SCALINGO_SECNUM_TOKEN }}",
              "regions": ["osc-fr1", "osc-secnum-fr1"] }
          ]
        }
  - name: Install slack output template
    run: |
      mkdir -p ~/.steampipe/check/templates/slack
      cp slackoutput.tmpl ~/.steampipe/check/templates/slack/output.tmpl
      sed -i s/##RUN_ID##/${{ github.run_id }}/ ~/.steampipe/check/templates/slack/output.tmpl
      sed -i s/##SERVER_URL##/${{ github.server_url }}/ ~/.steampipe/check/templates/slack/output.tmpl
      sed -i s/##REPOSITORY##/${{ github.repository }}/ ~/.steampipe/check/templates/slack/output.tmpl
  - name: Run checks
    id: checks
    continue-on-error: true
    run: steampipe check all --progress=false --export=results.md --export=results.slack
  - name: Output markdown to the step
    run: cat results.md >> $GITHUB_STEP_SUMMARY
  - name:
    run: |
      echo "STEAMPIPE_OUTPUT<<EOF" >> $GITHUB_ENV
      cat results.slack >> $GITHUB_ENV
      echo "EOF" >> $GITHUB_ENV
  - name: Post to a Slack channel
    if: ${{ steps.checks.outcome == 'failure' }}
    uses: slackapi/slack-github-action@v1.19.0
    with:
      channel-id: ${{ secrets.SLACK_CHANNEL_ID }}
      payload: |
        ${{ env.STEAMPIPE_OUTPUT }}
    env:
      SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
  - name: Exit
    if: ${{ steps.checks.outcome == 'failure' }}
    run: exit 1
```

[steampipe]: https://github.com/turbot/steampipe/
