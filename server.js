const fs = require("fs");
const { writeFile } = require("fs");
const { promisify } = require("util");
var fluent_ffmpeg = require("fluent-ffmpeg");
const fetch = require("node-fetch");
const express = require("express");
var app = express();
var bodyParser = require("body-parser");
var glob = require("glob");
const path = require("path");

const wfile = promisify(writeFile);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var port = process.env.PORT || 3000; // set our port

app.get("/:username", async (req, res) => {
  var videoURL = req.query.videoURL;
  console.log("GET call received");
  var readStream;
  glob(`**/${req.params.username.split(" ").join("_")}_*.mp4`, (er, files) => {
    console.log(files);
    for (const file of files) {
      fs.unlinkSync(__dirname + "\\" + file);
    }
  })
    .on("end", async () => {
      try {
        await fetchVideo(req.params.username, videoURL);
        console.log("Wrote to file");
      } catch (e) {
        console.log(e);
        console.log("Exception in fetching video");
      }

      try {
        await addWatermark(req.params.username);
      } catch (e) {
        console.log(e);

        console.log("Exception in adding watermark to video");
      }
      try {
        await addUsername(req.params.username);
      } catch (e) {
        console.log(e);

        console.log("Exception in adding username to video");
      }

      readStream = fs.createReadStream(
        req.params.username.split(" ").join("_") + "_converted.mp4"
      );
      console.log("Opened ReadStream");
      return readStream.pipe(res).on("finish", () => {
        console.log("Sent the Response");
        deleteFiles(req.params.username);
        readStream.close();
      });
    })
    .on("error", (err) => {
      console.log(err);
    });
});

app.listen(port);
console.log("Server is live at " + port);

async function fetchVideo(username, videoURL) {
  var internet_downloaded_video =
    username.split(" ").join("_") + "_raw_video.mp4";
  var internet_video_link = videoURL;
  try {
    var fetched_video = await fetch(internet_video_link);
    console.log("fetched video");
    var buffered_video = await fetched_video.buffer();
    console.log("buffered video");
    await wfile(internet_downloaded_video, buffered_video);
  } catch (e) {
    console.log(e);
  }
}

async function addWatermark(username) {
  var internet_downloaded_video =
    username.split(" ").join("_") + "_raw_video.mp4";
  var watermarked_video =
    username.split(" ").join("_") + "_watermarked_video.mp4";

  var rawFilePath = path.join(__dirname, `/${internet_downloaded_video}`);
  var watermarkPath = path.join(__dirname, `/new_logo.PNG`);
  var watermarkVideoPath = path.join(__dirname, `/${watermarked_video}`);

  if (fs.existsSync(rawFilePath)) {
    console.log(true);

    return new Promise((resolve, reject) => {
      fluent_ffmpeg()
        .input(rawFilePath)
        .addInput(watermarkPath)
        .videoCodec("libx264")
        .outputOptions("-pix_fmt yuv420p")
        .complexFilter(["overlay=0:H-h-10"])
        .output(watermarkVideoPath)
        .on("end", function () {
          resolve();
        })
        .on("error", function (err) {
          reject();
        })
        .run();
    });
  } else {
    console.log(false);
    return new Promise((resolve, reject) => {
      reject();
    });
  }
}

async function addUsername(username) {
  var watermarked_video =
    username.split(" ").join("_") + "_watermarked_video.mp4";
  var convertedVideo = username.split(" ").join("_") + "_converted.mp4";
  var watermarkVideoPath = path.join(__dirname, `/${watermarked_video}`);

  var convertedVideoPath = path.join(__dirname, `/${convertedVideo}`);
  return new Promise((resolve, reject) => {
    console.log("reached promise");
    fluent_ffmpeg(watermarkVideoPath)
      .videoFilters({
        filter: "drawtext",
        options: {
          // outputs: 1,
          fontfile: `${__dirname}/SegoePro-Regular.ttf`,
          text: `@${username.split(" ").join("_")}`,
          fontsize: 15,
          fontcolor: "yellow",
          x: "20",
          y: "h-th-15",
        },
        inputs: "3",
      })
      .output(convertedVideoPath)
      .on("end", function () {
        resolve();
      })
      .on("error", function (err) {
        reject();
      })
      .run();
  });
}

function deleteFiles(username) {
  fs.unlinkSync(
    __dirname + "\\" + username.split(" ").join("_") + "_raw_video.mp4"
  );
  fs.unlinkSync(
    __dirname + "\\" + username.split(" ").join("_") + "_watermarked_video.mp4"
  );
  fs.unlinkSync(
    __dirname + "\\" + username.split(" ").join("_") + "_converted.mp4"
  );
}
