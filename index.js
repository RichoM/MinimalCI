const cp = require('child_process');

// TODO(Richo): Make the CWD configurable by file?
const CWD = "temp/__test_cicd";


function exec(cmd, cwd) {
  return new Promise((resolve, reject) => {
    let options = {};
    options.cwd = cwd || CWD;
    let p = cp.exec(cmd, options, (error, stdout, stderr) => {
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


async function main() {
  try {
    await exec("git remote update");
    var data = await exec("git status");
    if (data.match("Your branch is behind")) {
      log("Stopping server...");
      log("Updating repository...");
      await exec("git pull");
      log("Restarting server...");
    } else {
      log("Up to date.")
    }
  } catch (err) {
    console.error("ERROR!");
    console.error(err);
  }
}

main();
