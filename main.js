require("dotenv").config(); // Load ENV variables
const blueBirdPromise = require("bluebird");
const connectSSH = require("./js/connectViaSSH.js");
const ciscoAxlPerfmon = require("cisco-axl-perfmon");
const ciscoDime = require("cisco-dime");
const cloudshark = require("cloudshark");
const cloudsharkApiToken = process.env.CLOUDSHARKAPI;

var settings = {
  version: process.env.VERSION,
  hostname: process.env.PUBLISHER,
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  commandTimeout: process.env.COMMANDTIMEOUT || 300000, //Timeout value in milliseconds. Up to 2147483647, which is just over 24 days.
  verbose: false,
  debug: false,
  filename: process.env.FILENAME,
};
var tagsArr = ["cisco", "cucm"];

(async () => {
  console.log(
    `%c
              Script brought to you by:
       ____ ____ ____ ____ ____ ____ ____ ____ 
      ||A |||u |||t |||o |||m |||a |||t |||e ||
      ||__|||__|||__|||__|||__|||__|||__|||__||
      |\/__\\|\/__\\|\/__\\|\/__\\|\/__\\|\/__\\|\/__\\|\/__\\|
       ____ ____ ____ ____ ____ ____ ____ ____ 
      ||B |||u |||i |||l |||d |||e |||r |||s ||
      ||__|||__|||__|||__|||__|||__|||__|||__||
      |\/__\\|\/__\\|\/__\\|\/__\\|\/__\\|\/__\\|\/__\\|\/__\\|
    
      `,
    `font-family: monospace`
  );

  let service = ciscoAxlPerfmon(
    settings.version,
    settings.hostname,
    settings.username,
    settings.password
  );

  console.log("Retrieving servers via AXL API.");

  // Retrieve server IP address from Publisher and return array ex. ["10.10.20.1","10.10.20.2"]
  let servers = await service.getServers().catch((err) => {
    console.log("Error retrieving servers: " + err);
    if (err === 401) {
      console.log(
        "Please check for correct IP Address, Username and/or Password."
      );
    }
    return false;
  });

  console.log(
    "Starting packet captures on",
    servers.length,
    "servers via ssh."
  );

  await blueBirdPromise
    .map(
      servers,
      async function (server) {
        settings.hostname = server;
        return await connectSSH
          .getPacketCapture(settings)
          .then((value) => {
            return value;
          })
          .catch((error) => {
            return error.level;
          });
      },
      { concurrency: Infinity }
    )
    .then(async (results) => {
      console.log(
        "Packet capture completed. Retrieving a list of files from server(s) via DIME API"
      );
      var pcapLogs = await blueBirdPromise.map(
        results,
        async function (result) {
          let output = await ciscoDime
            .selectLogFiles(
              result.server,
              settings.username,
              settings.password,
              "Packet Capture Logs",
              result.startTime,
              result.endTime,
              "Client: (GMT-8:0)America/Los_Angeles" // Client: (GMT+0:0)Greenwich Mean Time-Europe/London
            )
            .catch((err) => {
              console.log(err, result.server);
              return false;
            });
          return output;
        }
      );

      var flattened = [].concat.apply([], pcapLogs); // Flatten results
      console.log(
        "Successfully found",
        flattened.length,
        "files on servers. Attempting to retrieve via DimeGetFileService."
      );

      await blueBirdPromise
        .map(flattened, function (file) {
          return ciscoDime
            .getOneFile(
              file.server,
              settings.username,
              settings.password,
              file.absolutepath
            )
            .catch((err) => {
              console.log(err);
              return false;
            });
        })
        .then(async function (results) {
          console.log(
            "Successfully downloaded files via DIME. Attempting to upload to Cloudshark."
          );
          await blueBirdPromise
            .map(results, async function (result) {
              if (result) {
                // Change output file name to whatever you'd like
                var filename = result.filename.substring(
                  result.filename.lastIndexOf("/") + 1
                ); // Let's get the file name from the full path

                var uploadHttpPacket = await cloudshark.upload(
                  cloudsharkApiToken,
                  result.data,
                  filename,
                  "Automated upload.",
                  tagsArr
                );

                return uploadHttpPacket;
              } else {
                console.log("Error retrieving file");
              }
            })
            .then((results) => {
              console.log(
                "Successfully uploaded files to Cloudshark. View online via url:"
              );
              results.forEach((element) => {
                console.log("https://www.cloudshark.org/captures/" + element.id);
              });
              process.exit(0);
            });
        });
    });
})();
