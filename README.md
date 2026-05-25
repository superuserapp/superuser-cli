# Superuser Package Manager
## Extend AI agents with tools, instantly

`supr` is the official CLI for publishing [Superuser](https://superuser.app) packages.
You can use this utility to publish new packages to the Superuser toolkit registry,
available at [superuser.app/toolkits](https://superuser.app/toolkits).

[Superuser](https://superuser.app) enables you to build your own Superusers:
AI agents that can be extended with custom tools. It provides four major features;

1. Chat with and develop your agent in real time from the web
2. Extend your agent with [hosted tool packages](https://superuser.app/toolkits)
3. Write your own private tool packages for your agents
4. Deploy your agent to third-party services like Discord and Slack

## What is the Superuser toolkit registry?

The Superuser toolkit registry is a **serverless hosting platform and registry** for
building tools that extend AI chatbots and agents.

**Superuser toolkits are just REST API servers.**
Every package is an [Instant API](https://github.com/instant-dev/api) project,
which is a simple way to export and auto-document JavaScript functions as REST endpoints
that can be called via any HTTP client.

Authentication to your published packages are handled via **API keychains** which
are delegated via [Superuser](https://superuser.app).

## Superuser Package vs. MCP

We also provide **MCP bindings** for each package, available on its registry page.

## Quickstart

Visit [superuser.app/signup](https://superuser.app/signup) to register.
Creating a new bot is easy, you can then use this CLI to develop
and publish custom packages to extend your bots.

```shell
$ npm i superuser.app -g
$ mkdir new-project
$ cd new-project
$ sup init  # initialize project in this directory
$ sup login # log in to Superuser toolkit registry with your Superuser account
$ sup serve # run your tool package on a local server to test
$ sup run / # test a single endpoint (like curl)
$ sup publish    # publish to development environment
$ sup publish --env staging    # publish to staging environment
$ sup publish --env production # publish to production environment
```

You can run `sup help` at any time to see available commands.

# Table of contents

1. [How does Superuser work?](#how-does-instant-bot-work)
   1. [How is hosting billed?](#how-is-hosting-billed)
1. [Building custom packages for your bots](#building-custom-packages-for-your-bots)
   1. [Initialize a project](#initialize-a-project)
      1. [Defining tools aka endpoints](#defining-tools-aka-endpoints)
      1. [Endpoint name, description, types](#endpoint-name-description-types)
   1. [Deploy an Superuser Package](#deploy-an-instant-tool-package)
      1. [Private packages](#private-packages)
      1. [Public packages](#public-packages)
      1. [Open source packages](#open-source-packages)
1. [Additional utilities](#additional-utilities)
   1. [Generate endpoints](#generate-endpoints)
   1. [Generate tests](#generate-tests)
   1. [Run tests](#run-tests)
   1. [Environment variables](#environment-variables)
1. [Contact](#contact)

# How does Superuser work?

Superuser provides hosting for both (1) your agent and (2) your tool packages.
Your agent is a chatbot that you can chat with directly via the Superuser web interface.
Tool packages are REST APIs that can be used by your agent. You can publish tool packages
for use by your agent and others or keep them private.

When you ask your agent a question that requires a tool call, Superuser will
automatically route the request to the appropriate tool from the Superuser toolkit registry
and call the tool on your behalf.

## How is hosting billed?

Model usage (generating responses) is a subscription-based service. However,
for development purposes, you can use our lowest-tier model indefinitely in rate-limited mode
on the free tier **but only while on the web interface**.

Tools cost money to run, and are billed as serverless functions
at a rate of [50 of credits per 1,000 GB-s](https://superuser.app/pricing) of usage.
Credits are prepaid, and during our beta period all users get a one-time bonus of 100 free usage credits.
It costs $7.00 USD for 500 credits, with discounts for larger credit purchases.

GB-s represents a "gigabyte-second" and is calculated by the function RAM × execution time.
For example, a function with 512 MB (0.5 GB) of RAM running for 200ms would use:

- Used GB-s = 0.5GB × 0.2s = 0.1 GB-s
- Used credits = 50 / 1,000 GB-s × 0.1 GB-s = 0.005 credits (about $0.00007)

# Building custom packages for your bots

Building bots on [Superuser](https://superuser.app) is straightforward. Extending
with custom tool packages can be done online via the web interface, or if you prefer
working with your own editor, you can use this CLI.

## Initialize a project

To initialize a new Superuser toolkit:

```shell
$ npm i sup -g
$ mkdir new-project
$ cd new-project
$ sup init
```

You'll be walked through the process. The `supr` CLI will automatically check for
updates to core packages, so make sure you update when available. To play around with your
Superuser toolkit locally;

```shell
$ sup serve
```

Will start an HTTP server. To execute a standalone endpoint / tool:

```shell
$ sup run /
```

### Defining tools aka endpoints

Defining custom tools is easy. You'll find the terms **tool** and
**endpoint** used interchangeably as they all refer
to the same thing: your bot executing custom code in the cloud.

A **tool** is just an **endpoint** hosted by the Superuser toolkit registry.

All endpoints for Superuser toolkits live in the `functions/` directory.
Each file name maps to the endpoint route e.g. `functions/hello.js`
routes to `localhost:8000/hello`. You can export custom `GET`, `POST`, `PUT`
and `DELETE` functions from every file. Here's an example "hello world" endpoint:

```javascript
// functions/hello.js

/**
 * A basic hello world function
 * @param {string} name Your name
 * @returns {string} message The return message
 */
export async function GET (name = 'world') {
  return `hello ${name}`!
};
```

You can write any code you want and install any NPM packages you'd like to
your tool package.

### Endpoint name, description, types

Using the comment block above every exported method (e.g. GET) you can
define your endpoint. Superuser toolkits use an open source specification called
[Instant API](https://github.com/instant-dev/api) to export JavaScript
functions as type safe web APIs. You can learn more about how to properly
define and document the shape (parameters) of your API there.

## Deploy a Superuser Package

### Private packages

Private packages can only be viewed and executed by the organization that created them.

**Private package source code is not visible** and can only be viewed when using our command
line tools to download a project.

By default all packages are created with visibility set to private.
Packages are namespaced to your username, e.g. `@my-username/project`.
This can be found in the `"name"` field of `superuser.json`.

Your credit balance will be charged directly for use of private packages.

To deploy a private project to a `development` environment, you can use:

```shell
$ sup publish
```

You can also publish to `staging` and `production` using:

```shell
$ sup publish --env staging
$ sup publish --env production
```

### Public packages

Public packages can be viewed and executed by anybody.

**Public package source code is not visible**, but the tools themselves are available for others to use.
You would create a public package for a proprietary tool, say custom image generation, that you
want the public to be able to use but not see the code for.

You **will not** be charged for other people using your public tools.
They are billed directly from their account.

You can change your package to `public` by changing its settings on Superuser at:
`https://superuser.app/org/{your-org}/{name}`

### Open source packages

Open source packages can be viewed and executed by anybody.

**Open source package source code is visible** and API keys can be shared with these packages.
You would create an open source package for a tool that requires third-party API keys to use
successfully: mostly for B2B tools like Stripe, HubSpot, etc.

You **will not** be charged for other people using your open source tools.
They are billed directly from their account.

You can change your package to `open source` by changing its settings on Superuser at:
`https://superuser.app/org/{your-org}/{name}`

# Additional utilities

There are a few additional utilities you may find useful with this package;

## Generate endpoints

```shell
# generates functions/my-endpoint/example.js
$ sup g:endpoint my-endpoint/example
```

## Generate tests

```shell
# Generate blank tests or ones for an endpoint
$ sup g:test my_test # OR ...
$ sup g:test --endpoint my-endpoint/example
```

## Run tests

You can write tests for your tools to verify they work. Simply run;

```shell
$ sup test
```

And voila!

## Environment variables

You can store environment variables with your packages in;

```
.env
.env.production
.env.staging
```

These files **will not** be published for everybody to see, so
you can use them to hide secrets within your code. However, be
careful when using environment variables with public packages:
if you ever return them in an endpoint response, or connect to
sensitive data, there's a chance you may expose that information
to another user of the platform.

# Contact

The best place for help and support is Discord at [discord.gg/superuser](https://discord.gg/superuser),
but feel free to bookmark all of these links.

| Destination | Link |
| ----------- | ---- |
| Superuser | [superuser.app](https://superuser.app) |
| GitHub | [github.com/superuserapp](https://github.com/superuserapp) |
| Discord | [discord.gg/superuser](https://discord.gg/superuser) |
| X / @super_user_app | [x.com/super_user_app](https://x.com/super_user_app) |
| X / Keith Horwood | [x.com/keithwhor](https://x.com/keithwhor) |
| X / Scott Gamble | [x.com/threesided](https://x.com/threesided) |
