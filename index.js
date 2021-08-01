const cp = require('child_process');

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
    p.stdout.on("data", (data) => { console.log(data.toString().trim()); });
    p.stderr.on("data", (data) => { console.log(data.toString().trim()); });
    p.on('exit', (code) => { console.log("--- Process (PID: " + p.pid + ") exited with code " + code) });
    console.log("--- Started process (PID: " + p.pid + ") $ " + (cwd ? cwd : ".") + " > " + cmd);
  });
}

function log(str) { console.log(str); }

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function loop() {
  try {
    await exec("git remote update");
    var data = await exec("git status");
    if (data.match("Your branch is behind")) {
      log("Stopping server...");
      await stop();
      log("Updating repository...");
      await exec("git pull");
      log("Restarting server...");
      await start();
    } else {
      log("Up to date.");
    }
  } catch (err) {
    console.error("Error while checking changes!");
    console.error(err);
  }
}

async function start() {
  let temp = [];
  const start_fn = (cmd) => new Promise((res, rej) => {
    log("Running: " + cmd);
    child = cp.exec(cmd, {cwd: CWD});
    child.on("error", rej);
    child.on("spawn", res);
    temp.push(child);
  });
  for (let i = 0; i < START_CMDS.length; i++) {
    let cmd = START_CMDS[i];
    await start_fn(cmd);
  }
  childs = temp;
}

async function stop() {
  if (!childs) return;
  let temp = childs;
  childs = null;
  await Promise.all(temp.map(child => new Promise(res => {
    child.on("exit", res);
    console.log(child.kill());
  })));
}

async function main() {
  await start();
  console.log(childs);
  await sleep(5000);
  await stop();
  return;
  while (true) {
    await loop();
    await sleep(INTERVAL * 1000);
  }
}

main();
