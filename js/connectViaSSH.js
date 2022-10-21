const keypress = require("keypress");

function formatDate(dateVal) {
  var newDate = new Date(dateVal);

  var sMonth = padValue(newDate.getMonth() + 1);
  var sDay = padValue(newDate.getDate());
  var sYear = newDate.getFullYear();
  var sHour = newDate.getHours();
  var sMinute = padValue(newDate.getMinutes());
  var sAMPM = "AM";

  var iHourCheck = parseInt(sHour);

  if (iHourCheck > 12) {
    sAMPM = "PM";
    sHour = iHourCheck - 12;
  } else if (iHourCheck === 0) {
    sHour = "12";
  }

  sHour = padValue(sHour);

  return (
    sMonth +
    "/" +
    sDay +
    "/" +
    sYear +
    " " +
    sHour +
    ":" +
    sMinute +
    " " +
    sAMPM
  );
}

function padValue(value) {
  return value < 10 ? "0" + value : value;
}

var outputMsg = {
  server: "",
  status: "",
  startTime: "",
  endTime:''
};

module.exports = {
  getPacketCapture: function (options) {
    return new Promise((resolve, reject) => {
      // make `process.stdin` begin emitting "keypress" events
      keypress(process.stdin);
      // listen for the "keypress" event
      process.stdin.on("keypress", function (ch, key) {
        if (key && key.ctrl && key.name == "c") {
          console.log(
            "Ctrl-c detected. Forcing connection closed and exiting."
          );

          outputMsg.status = "forced";
          outputMsg.endTime = formatDate(new Date());
          SSH.close();
          resolve(outputMsg);
        }
        if (key && key.ctrl && key.name == "z") {
          console.log("Ctrl-z detected. Quitting node application.");
          reject("ctrl-z");
        }
      });

      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
      }

      var commandTimeout = options.commandTimeout;
      var hostname = options.hostname;
      var startTime = formatDate(new Date());
      outputMsg.server = options.hostname;
      outputMsg.startTime = startTime;

      let host = {
        server: {
          host: options.hostname,
          userName: options.username,
          password: options.password,
        },
        commands: [`utils network capture-rotate sizePerFile 1 file ${options.filename}`],
        standardPrompt: "admin:",
        passwordPrompt: "#",
        passphrasePrompt: "#",
        idleTimeOut: commandTimeout,
        dataIdleTimeOut: 500,
        verbose: options.verbose,
        debug: options.debug,
        connectedMessage: "SSH: Connected to " + hostname + ".",
        readyMessage:
          "SSH: Ready. Running command for " +
          commandTimeout / 1000 +
          " seconds. Press Ctrl-c to force connection closed.",
        closedMessage: "SSH: Connection to " + hostname + " closed.",
        onCommandTimeout: function (command, response, stream, connection) {
          this.emit(
            "msg",
            "SSH: Command `" +
              command +
              "` finished after " +
              this.sshObj.idleTimeOut / 1000 +
              " seconds. Closing connection and exiting."
          );

          stream.write("\x03");
          stream.end();
          connection.end();
        },
        onEnd: function (sessionText, sshObj) {
          this.emit("msg", "SSH: Connection ended.");
        },
        onError: function (err, type, close = true) {
          process.stdin.setRawMode(false);
          reject(err);
        },
      };

      var SSH2Shell = require("ssh2shell"),
        SSH = new SSH2Shell(host),
        callback = function (sessionText) {
          // console.log(sessionText);
          process.stdin.setRawMode(false);
          outputMsg.status = "success";
          outputMsg.endTime = formatDate(new Date());
          resolve(outputMsg);
        };

      //Start the process
      SSH.connect(callback); // or SSH.connect(callback); to display sessionText from connection
    });
  },
};
