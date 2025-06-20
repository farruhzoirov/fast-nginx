const { spawn } = require("child_process");
const fs = require("fs");

async function sudoWriteFsFile(code, filePath, data, callback) {
  // const sudoProcess = spawn("sudo", [
  //   "node",
  //   "-e",
  //   `${code}('${filePath}', "${data ? data : ""}", 'utf8')`,
  // ]);
  //
  // sudoProcess.on("close", (code) => {
  //   if (code === 0) {
  //     callback(null);
  //   } else {
  //     callback(new Error(`Sudo process exited with code ${code}`));
  //   }
  // });
  //
  // sudoProcess.on("error", (err) => {
  //   callback(err);
  // });

    return new Promise((resolve, reject) => {
      const sudoProcess = spawn("sudo", [
        "tee",
        filePath
      ]);

      sudoProcess.stdin.write(data);
      sudoProcess.stdin.end();

      sudoProcess.stderr.on('data', (data) => {
        callback(data)
      });

      sudoProcess.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          callback(reject(new Error(`Failed to write file. Exit code: ${code}`)));
        }
      });

      sudoProcess.on("error", (err) => {
        callback(reject(err));
      });
    });
}

async function sudoLinkFsFile(path1, path2, callback) {
  const sudoProcess = spawn("sudo", [
    "ln",
    "-s",
    path1,
    path2,
  ]);

  sudoProcess.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  sudoProcess.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  sudoProcess.on("close", (code) => {
    if (code === 0) {
      callback(null);
    }

    if (code === 1) {
      const removeProcess = spawn("sudo", [
          "rm", path2
      ]);

      removeProcess.on("close", (rmCode) => {
        if (rmCode === 0) {
          sudoLinkFsFile(path1, path2, callback);
        } else {
          callback(new Error(`Failed to remove file: ${path2}`));
        }
      });
    }
  });

  sudoProcess.on("error", (err) => {
    console.log("Link Error", err);
    callback(err);
  });
}

async function sudoUnlinkFsFile(code, path, callback) {
  const sudoProcess = spawn("sudo", ["node", "-e", `${code}(${path})`]);

  sudoProcess.on("close", (code) => {
    if (code === 0) {
      callback(null);
    } else {
      callback(new Error(`Sudo process exited with code ${code}`));
    }
  });

  sudoProcess.on("error", (err) => {
    callback(err);
  });
}

module.exports = {
  sudoWriteFsFile,
  sudoLinkFsFile,
  sudoUnlinkFsFile,
};
