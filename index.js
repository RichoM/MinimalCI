const cp = require('child_process');
const kill = require('tree-kill');
const fs = require("fs").promises;


// NOTE(Richo): Default config
let config = {
  cwd: "temp/__test_cicd", // Git repository
  interval: 10, // Seconds between checks
  start: [{command: "node ."}],
  stop: []
};

let childs = null;

function exec(cmd, options) {
  return new Promise((resolve, reject) => {
    let opts = options || {};
    if (!opts.cwd) { opts.cwd = config.cwd; }
    let p = cp.exec(cmd, opts, (error, stdout, stderr) => {
      if (error) {
        reject({ error: error, stdout: stdout, stderr: stderr });
      } else {
        p.kill();
        resolve(stdout);
      }
    });
    // TODO(Richo): The following should only be logged to a debug file or something...
    /*
    p.stdout.on("data", (data) => { console.log(data.toString().trim()); });
    p.stderr.on("data", (data) => { console.log(data.toString().trim()); });
    p.on('exit', (code) => { console.log("--- Process (PID: " + p.pid + ") exited with code " + code) });
    console.log("--- Started process (PID: " + p.pid + ") $ " + (opts.cwd ? opts.cwd : ".") + " > " + cmd);
    */
  });
}

function start(command) {
  return new Promise((res, rej) => {
    let cmd = command.command;
    let opts = command.options || {};
    if (!opts.cwd) { opts.cwd = config.cwd; }
    child = cp.exec(cmd, opts);
    child.stdout.on("data", data => console.log(`>${child.pid}> ${data.toString().trim()}`));
    child.stderr.on("data", data => console.error(`>${child.pid}> ${data.toString().trim()}`));
    child.on("error", rej);
    child.on("spawn", () => res(child));
    log("- Starting process: " + child.pid);
  });
}

function stop(child) {
  return new Promise(res => {
    log("- Stopping process: " + child.pid);
    kill(child.pid, "SIGTERM", res);
  });
}

function log(str) { console.log(str); }

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function checkRepository() {
  try {
    await exec("git remote update");
    var data = await exec("git status");
    return data.match("Your branch is behind");
  } catch (err) {
    console.error("Error while checking repository for changes!");
    console.error(err);
  }
}

async function updateRepository() {
  try {
    await exec("git pull");
  } catch (err) {
    console.error("Error while updating repository!");
    console.error(err);
  }
}

async function startAll() {
  try {
    let temp = [];
    for (let i = 0; i < config.start.length; i++) {
      temp.push(await start(config.start[i]));
    }
    childs = temp;
  } catch (err) {
    console.error("Error while starting child processes!");
    console.error(err);
  }
}

async function stopAll() {
  try {
    if (!childs) return;
    await Promise.all(childs.map(stop));
    childs = null;
  } catch (err) {
    console.error("Error while stopping child processes!");
    console.error(err);
  }

  for (let i = 0; i < config.stop.length; i++) {
    // TODO(Richo): Handle individual errors...
    let cmd = config.stop[i].command;
    let opts = config.stop[i].options || {};
    await exec(cmd, opts);
  }
}

async function readConfigFile() {
  try {
    let data = await fs.readFile("config.json");
    let str = data.toString();
    config = JSON.parse(str);
  } catch (err) {
    console.error("Error while reading configuration file!");
    console.error(err);
  }
}

async function main() {
  await readConfigFile();
  log(JSON.stringify(config, null, 2));
  await startAll();
  while (true) {
    let changes = await checkRepository();
    if (changes) {
      log("Changes found. Updating...");
      await stopAll();
      await sleep(1000); // Just in case
      await updateRepository();
      await sleep(1000); // Just in case
      await startAll();
    } else {
      log("Repository up to date. Nothing to do.");
    }
    log(`Sleeping for ${config.interval} seconds...`);
    await sleep(config.interval * 1000);
  }
}

main();
