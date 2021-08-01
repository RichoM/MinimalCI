const cp = require('child_process');
const kill = require('tree-kill');

// TODO(Richo): Make these parameters configurable by file?
const CWD = "temp/__test_cicd";
const INTERVAL = 10;
const START_CMDS = ["node ."];

let childs = null;

function exec(cmd) {
  return new Promise((resolve, reject) => {
    let cwd = CWD;
    let p = cp.exec(cmd, {cwd: cwd}, (error, stdout, stderr) => {
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
    console.log("--- Started process (PID: " + p.pid + ") $ " + (cwd ? cwd : ".") + " > " + cmd);
    */
  });
}

function start(cmd) {
  return new Promise((res, rej) => {
    child = cp.exec(cmd, {cwd: CWD});
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
    for (let i = 0; i < START_CMDS.length; i++) {
      temp.push(await start(START_CMDS[i]));
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
}

async function main() {
  await startAll();
  while (true) {
    let changes = await checkRepository();
    if (changes) {
      log("Changes found. Updating...");
      await stopAll();
      await updateRepository();
      await startAll();
    } else {
      log("Repository up to date. Nothing to do.");
    }
    log(`Sleeping for ${INTERVAL} seconds...`);
    await sleep(INTERVAL * 1000);
  }
}

main();
