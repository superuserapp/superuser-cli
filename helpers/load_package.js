const https = require('https');
const path = require('path');
const fs = require('fs');

const verifyPackages = require('./verify_packages.js');

module.exports = async (params = null, validate = false) => {

  if (validate) {
    await verifyPackages(true);
  }

  let toolpkg;
  const toolPathname = path.join(process.cwd(), 'superuser.json');
  if (!fs.existsSync(toolPathname)) {
    if (validate) {
      throw new Error(
        `No "superuser.json" in this directory. Are you sure you meant to do this?\n` +
        `Run \`$ ibot init\` to initialize a project here if you are.`
      );
    }
  } else {
    toolpkg = JSON.parse(fs.readFileSync(toolPathname));
  }

  let dotenv;
  const dotenvPathname = path.join(process.cwd(), 'node_modules', 'dotenv');
  if (!fs.existsSync(dotenvPathname)) {
    if (validate) {
      throw new Error(
        `dotenv should be installed in this directory to use Superuser Package locally.\n` +
        `Run \`$ npm i dotenv --save-dev\` to install the latest version`
      );
    }
  } else {
    dotenv = require(dotenvPathname);
  }

  let InstantAPI;
  const pathname = path.join(process.cwd(), 'node_modules', '@instant.dev/api');
  if (!fs.existsSync(pathname)) {
    if (validate) {
      throw new Error(
        `@instant.dev/api should be installed in this directory to use Superuser Package locally.\n` +
        `Run \`$ npm i @instant.dev/api --save-dev\` to install the latest version`
      );
    }
  } else {
    InstantAPI = require(pathname);
  }

  if (
    toolpkg &&
    dotenv &&
    InstantAPI
  ) {
    return { toolpkg, dotenv, InstantAPI };
  } else {
    return null;
  }

};
