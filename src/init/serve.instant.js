/**
 * This file is ** NOT ** used in production on the Superuser toolkit registry
 * Any code you change here ** WILL NOT ** run when hosted with Superuser Package
 * 
 * However, it used for local development and allows you to ship your Superuser Package
 * service to any host which relies on `package.json["scripts"]["start"]`.
 */

// Third-party imports
import InstantAPI from '@instant.dev/api';
import dotenv from 'dotenv';

// Native imports
import cluster from 'cluster';
import os from 'os';

// config
import config from './superuser.json' with { type: 'json' };

// Shorthand references
const Daemon = InstantAPI.Daemon;
const Gateway = InstantAPI.Daemon.Gateway;
const EncryptionTools = InstantAPI.EncryptionTools;

// Constants
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 8100;

if (cluster.isPrimary) {

  // Multi-process daemon
  const daemon = new Daemon(
    ENVIRONMENT !== 'development'
      ? os.cpus().length
      : 1,
    'SuperuserDaemon'
  );
  daemon.start(PORT);

} else {

  // Individual webserver startup
  const gateway = new Gateway({
    name: 'SuperuserDaemon.Gateway',
    debug: ENVIRONMENT !== 'production',
    defaultTimeout: (parseInt(config.timeout) || 10) * 1_000
  });
  // Optional: Enable Sentry or another error reporting tool
  // gateway.setErrorHandler(err => Sentry.captureException(err));
  const et = new EncryptionTools();
  dotenv.config();                   // load env vars
  et.decryptProcessEnv(process.env); // decrypt env vars, if necessary
  gateway.load(process.cwd());       // load routes from filesystem
  gateway.listen(PORT);              // start server

}