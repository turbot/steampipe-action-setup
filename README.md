# Setup Steampipe for GitHub Actions

<p align="center">
  <a href="https://github.com/turbot/steampipe-action-setup/actions"><img alt="steampipe-action status" src="https://github.com/turbot/steampipe-action-setup/workflows/units-test/badge.svg"></a>
</p>

This action installs [Steampipe](https://github.com/turbot/steampipe/) and optionally installs plugins and creates plugin connection configurations.

## Usage

See [action.yml](action.yml).

## Examples

### Install the latest version Steampipe

```yaml
- name: Install Steampipe
  uses: turbot/steampipe-action-setup
```

### Install a specific version of Steampipe

```yaml
- name: Install Steampipe v0.19.4
  uses: turbot/steampipe-action-setup
  with:
    version: 0.19.4
```

> For available Steampipe versions refer to [Steampipe Releases](https://github.com/turbot/steampipe/releases).

### Configure multiple AWS connections

```yaml
- name: Setup Steampipe
  uses: turbot/steampipe-action-setup
  with:
    connections: |
      connection "aws_prod" {
        plugin     = "aws"
        secret_key = "${{ secrets.AWS_ACCESS_KEY_ID_PROD }}"
        access_key = "${{ secrets.AWS_SECRET_ACCESS_KEY_PROD }}"
        regions    = ["us-east-1", "us-west-2"]
      }

      connection "aws_dev" {
        plugin     = "aws"
        secret_key = "${{ secrets.AWS_ACCESS_KEY_ID_DEV }}"
        access_key = "${{ secrets.AWS_SECRET_ACCESS_KEY_DEV }}"
        regions    = ["*"]
      }

- name: Run queries
  run: |
    steampipe query "select * from aws_prod.aws_account"
    steampipe query "select * from aws_dev.aws_account"
```

### Install a specific plugin version

```yaml
- name: Setup Steampipe
  uses: turbot/steampipe-action-setup
  with:
    connections: |
      connection "net" {
        plugin = "net@0.7"
      }
- name: Run a query
  run: steampipe query "select issuer, not_after as exp_date from net_certificate where domain = 'github.com'"
```

### Create a connection with JSON

```yaml
- name: Setup Steampipe
  uses: turbot/steampipe-action-setup
  with:
    connections: |
      {
        "connection": {
          "aws_dev": {
            "plugin": "aws",
            "profile": "default",
            "regions": ["us-east-1", "eu-west-1"]
          }
        }
      }
- name: Run a query
  run: steampipe query "select name from aws_s3_bucket"
```

## Advanced Examples

### Run local controls

```yaml
steps:
  - uses: actions/checkout@v3
  - uses: turbot/steampipe-action-setup@v1
    with:
      steampipe-version: 'latest'
      plugin-connections: |
        connection "github" {
          plugin = "github"
          token  = "${{ secrets.GITHUB_TOKEN }}"
        }

        connection "scalingo" {
          plugin      = "francois2metz/scalingo"
          type        = "aggregator"
          connections = ["scalingo2", "scalingo3"]
        }

        connection "scalingo2" {
          plugin  = "francois2metz/scalingo"
          token   = "${{ secrets.SCALINGO_TOKEN }}"
          regions = ["osc-fr1"]
        }

        connection "scalingo3" {
          plugin  = "francois2metz/scalingo"
          token   = "${{ secrets.SCALINGO_SECNUM_TOKEN }}"
          regions = ["osc-fr1", "osc-secnum-fr1"]
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
  - uses: turbot/steampipe-action-setup@v1
    with:
      steampipe-version: 'latest'
      plugin-connections: |
        connection "github" {
          plugin = "github"
          token  = "${{ secrets.GITHUB_TOKEN }}"
        }

        connection "scalingo" {
          plugin      = "francois2metz/scalingo"
          type        = "aggregator"
          connections = ["scalingo2", "scalingo3"]
        }

        connection "scalingo2" {
          plugin  = "francois2metz/scalingo"
          token   = "${{ secrets.SCALINGO_TOKEN }}"
          regions = ["osc-fr1"]
        }

        connection "scalingo3" {
          plugin  = "francois2metz/scalingo"
          token   = "${{ secrets.SCALINGO_SECNUM_TOKEN }}"
          regions = ["osc-fr1", "osc-secnum-fr1"]
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

## Helpful Links

- [Steampipe docs](https://steampipe.io/docs)
- [Steampipe plugins](https://hub.steampipe.io/plugins)
