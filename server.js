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

  var readStreamPath = path.join(
    __dirname,
    `/${req.params.username.split(" ").join("_")}_converted.mp4`
  );
  if (fs.existsSync(readStreamPath)) {
    return readStream.pipe(res, { end: true }).on("finish", () => {
      console.log("Sent the Response");
      //deleteFiles(req.params.username);
      readStream.close();
    });
  } else {
    try {
      await fetchVideo(req.params.username, videoURL);
      console.log("Wrote to file");
    } catch (err) {
      console.log(err);
      console.log("Exception in fetching video");
    }
    try {
      await addWatermark(req.params.username);
    } catch (err) {
      console.log(err);
      console.log("Exception in adding watermark to video");
    }
    try {
      await addUsername(req.params.username);
    } catch (err) {
      console.log(err);
      console.log("Exception in adding username to video");
    }

    readStream = fs.createReadStream(readStreamPath);

    console.log("Opened ReadStream");
    return readStream.pipe(res, { end: true }).on("finish", () => {
      console.log("Sent the Response");
      //deleteFiles(req.params.username);
      readStream.close();
    });
  }
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
  var watermarkPath = path.join(__dirname, `/new_logo.png`);
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
  var fontPath = path.join(__dirname, "/SegoePro-Regular.ttf");
  var convertedVideoPath = path.join(__dirname, `/${convertedVideo}`);
  return new Promise((resolve, reject) => {
    console.log("reached promise");
    fluent_ffmpeg(watermarkVideoPath)
      .videoFilters({
        filter: "drawtext",
        options: {
          // outputs: 1,
          fontfile: `${fontPath}`,
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
  var watermarked_video =
    username.split(" ").join("_") + "_watermarked_video.mp4";
  var convertedVideo = username.split(" ").join("_") + "_converted.mp4";
  var internet_downloaded_video =
    username.split(" ").join("_") + "_raw_video.mp4";
  var watermarkVideoPath = path.join(__dirname, `/${watermarked_video}`);
  var convertedVideoPath = path.join(__dirname, `/${convertedVideo}`);
  var rawFilePath = path.join(__dirname, `/${internet_downloaded_video}`);

  fs.unlinkSync(rawFilePath);
  fs.unlinkSync(watermarkVideoPath);
  fs.unlinkSync(convertedVideoPath);
}
