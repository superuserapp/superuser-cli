const { Command } = require('cmnd');
const colors = require('colors/safe');
const io = require('io');
const kill = require('tree-kill');
const net = require('net');

const loadPackage = require('../helpers/load_package.js');
const localServer = require('../helpers/local_server.js');

const sleep = t => new Promise(r => setTimeout(() => r(1), t));
const isPortAvailable = (port) => {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        reject(err);
      }
    });
    server.once('listening', () => {
      server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
    // Bind to all interfaces (same as the spawned server) so we reliably
    // detect any process occupying this port, not just localhost-bound ones.
    server.listen(port);
  });
};
const getAvailablePort = async (startPort, maxIncrements = 10) => {
  for (let i = 0; i <= maxIncrements; i++) {
    const candidatePort = startPort + i;
    const available = await isPortAvailable(candidatePort);
    if (available) {
      return candidatePort;
    }
  }
  return null;
};
const killProcess = pid => {
  return new Promise((resolve, reject) => {
    kill(pid, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
};
const safeKillProcess = async (pid) => {
  if (!pid) {
    return;
  }
  try {
    await killProcess(pid);
  } catch (err) {
    if (err && err.code === 'ESRCH') {
      return;
    }
    throw err;
  }
};

class RunCommand extends Command {

  constructor() {
    super('run');
  }

  help() {
    return {
      description: 'Runs a function in the local project',
      args: [],
      flags: {
        'm': 'Specify method, default is "get"',
        'v': 'Verbose mode: shows URL, status code and arguments'
      },
      vflags: {
        '*': 'Used to populate query and / or body parameters'
      }
    };
  }

  async run(params) {

    const { default: terminalImage } = await import('terminal-image');

    // Use 8199 for test runs
    const InstantPackage = await loadPackage(params, true);
    const basePort = 8199;
    const maxPortIncrements = 10;
    const timeout = 5000;

    // Validate arguments, default method is "get"
    let method = ((params.flags['m'] || [])[0] || 'get').toLowerCase();
    if (['get', 'post', 'put', 'delete', 'del'].indexOf(method) === -1) {
      throw new Error(`Method "${method}" not supported.`);
    }
    if (method === 'del') {
      method = 'delete';
    }
    const functionParams = Object.keys(params.vflags).reduce((functionParams, key) => {
      functionParams[key] = params.vflags[key].join(' ');
      return functionParams;
    }, {});
    let pathname = params.args[0] || '';
    if (!pathname) {
      throw new Error(
        `Please provide a pathname as the first argument.\n` +
        `Use "/" to execute the root method (index.js)`
      );
    }
    if (pathname.startsWith('..')) {
      throw new Error(`Invalid pathname: "${pathname}"`);
    }
    if (pathname.startsWith('.')) {
      pathname = pathname.slice(1);
    }
    if (pathname.startsWith('/')) {
      pathname = pathname.slice(1);
    }

    const port = await getAvailablePort(basePort, maxPortIncrements);
    if (!port) {
      throw new Error(
        `No available port found in range ${basePort}-${basePort + maxPortIncrements}.\n` +
        `Stop one of those processes, then retry.\n` +
        `Unix: lsof -ti :${basePort}-${basePort + maxPortIncrements}`
      );
    }
    const url = `http://localhost:${port}`;

    let proc = null;
    try {
      proc = localServer.run({ port, isBackground: true });
      let isConnected = false;
      let startupError = null;

      proc.on('error', err => {
        startupError = err;
      });
      proc.stdout.on('error', err => {
        startupError = err;
      });
      proc.stderr.on('error', err => {
        startupError = err;
      });
      proc.stdout.on('data', data => {
        const message = data.toString();

        if (message.includes(`*** Listening on localhost:${port}`)) {
          isConnected = true;
        } else if (message.includes(`Unable to spawn HTTP Workers, listening on port ${port}`)) {
          isConnected = true;
        }
      });
      proc.stderr.on('data', () => {
        // Drain stderr for background process to avoid blocked pipes.
      });

      // Wait for connection or timeout
      let isTimedOut = false;
      await Promise.race([
        (async () => {
          await sleep(timeout);
          if (!isConnected) {
            isTimedOut = true;
            throw new Error(
              `Timed out waiting for development server.\n` +
              `Are you sure you're not running another server on :${port}?\n` +
              `To kill any processes running on this port on a unix system, use:\n` +
              `$ lsof -ti :${port} | xargs kill -9`
            );
          }
        })(),
        (async () => {
          while (!isConnected && !isTimedOut) {
            if (startupError) {
              throw startupError;
            }
            await sleep(1);
          }
          if (startupError) {
            throw startupError;
          }
          return true;
        })()
      ]);

      const queryParams = (method === 'get' || method === 'delete')
        ? { ...functionParams }
        : {};
      queryParams._debug = true;
      const bodyParams = (method === 'post' || method === 'put')
        ? JSON.stringify(functionParams)
        : '';

      let result;
      const streamResult = await io.request(
        method.toUpperCase(),
        `${url}/${pathname}`,
        queryParams,
        {},
        bodyParams,
        ({id, event, data}) => {
          if (event === '@response') {
            let json = JSON.parse(data.split('\n').join(''));
            result = json;
          } else if (event === '@stdout') {
            let json = JSON.parse(data.split('\n').join(''));
            json.split('\n').forEach(line => {
              console.log(colors.grey(`${params.flags.v ? colors.bold(`stdout> `) : ''}${line}`));
            });
          } else if (event === '@stderr') {
            let json = JSON.parse(data.split('\n').join(''));
            json.split('\n').forEach(line => {
              console.log(colors.yellow(`${params.flags.v ? colors.bold(`stderr> `) : ''}${line}`));
            });
          } else {
            console.log(colors.blue(`${colors.bold(`${event}> `)}${data}`));
          }
        }
      );

      // Handle non-event errors given by server
      if (streamResult.statusCode === 500 || streamResult.statusCode === 501 || streamResult.statusCode === 404) {
        const errorBody = streamResult.body.toString();
        let errorMessage = errorBody;
        let json = null;
        try {
          json = JSON.parse(errorBody);
        } catch (e) {
          // do nothing
        
        }
        if (json) {
          if (json.error) {
            errorMessage = json.error.message;
            const error = new Error(errorMessage);
            if (json.error.stack) {
              error.stack = json.error.stack;
            }
            throw error;
          } else if (json.message) {
            throw new Error(json.message);
          } else {
            throw new Error(errorMessage);
          }
        } else {
          // cut out the "Application Error: " prefix and only capture the first line
          if (errorBody.startsWith('Application Error:')) {
            errorMessage = errorBody.slice('Application Error: '.length);
          }
          // ignore the stack trace
          const stack = errorMessage;
          errorMessage = stack.split('\n')[0];
          const error = new Error(errorMessage);
          error.stack = stack;
          throw error;
        }
      }

      // retrieve details
      const body = result.body.toString();
      let json;
      try {
        json = JSON.parse(body);
      } catch (e) {
        // do nothing
      }

      if (params.flags.v) {
        console.log(colors.bold.green('location:  ') + `${url}/${pathname}`);
        console.log(colors.bold.green('method:    ') + method.toUpperCase());
        console.log(colors.bold.green('status:    ') + result.statusCode);
        console.log(colors.bold.green('arguments: '));
        console.log(JSON.stringify(functionParams, null, 2));
        console.log(colors.bold.green('result:'));
      }
      if (json) {
        if (result.statusCode.toString()[0] !== '2') {
          if (json.error) {
            const error = new Error(json.error.message);
            if (json.error.stack) {
              error.stack = json.error.stack;
            }
            console.log(JSON.stringify(json, null, 2));
            throw error;
          }
        }
        if (
          result.headers['Content-Type']?.startsWith('image/') &&
          json._base64
        ) {
          const imageBuffer = Buffer.from(json._base64, 'base64');
          const image = await terminalImage.buffer(imageBuffer, { width: '60%' });
          console.log(image);
        } else {
          console.log(JSON.stringify(json, null, 2));
        }
      } else {
        if (result.headers['Content-Type']?.startsWith('image/')) {
          const imageBuffer = Buffer.from(body);
          const image = await terminalImage.buffer(imageBuffer, { width: '60%' });
          console.log(image);
        } else {
          console.log(body);
        }
      }
    } finally {
      if (proc && proc.pid) {
        await safeKillProcess(proc.pid);
      }
    }

    return void 0;

  }

}

module.exports = RunCommand;
