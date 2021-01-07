const fs = require("fs");
var ffmpeg = require("ffmpeg");
var fluent_ffmpeg = require("fluent-ffmpeg");
const fetch = require("node-fetch");
const express = require("express");
var app = express();
var bodyParser = require("body-parser");
var glob = require("glob");

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
      await createWatermark(req.params.username, videoURL).then((value) => {
        console.log(value);
        readStream = fs.createReadStream(
          req.params.username.split(" ").join("_") + "_converted.mp4"
        );
        console.log("Opened ReadStream");
        return readStream.pipe(res).on("finish", () => {
          console.log("Sent the Response");
          deleteFiles(req.params.username);
          readStream.close();
        });
      });
    })
    .on("error", (err) => {
      console.log(err);
    });
});

app.listen(port);
console.log("Server is live at " + port);

async function createWatermark(username, videoURL) {
  console.log("createdWaterMark Started");
  var watermarkPath = "new_logo.png";
  var internet_downloaded_video =
    username.split(" ").join("_") + "_raw_video.mp4";
  var internet_video_link = videoURL;
  var watermarked_video =
    username.split(" ").join("_") + "_watermarked_video.mp4";
  console.log(username.split(" ").join("_"));
  console.log(internet_video_link);
  try {
    await fetch(internet_video_link).then(async (value) => {
      console.log("Fetched Video");
      await value.buffer().then((value) => {
        console.log("Buffered Video");
        fs.writeFile(internet_downloaded_video, value, () =>
          console.log("Wrote Video To File")
        );
      });
    });
  } catch (e) {
    console.log(
      "Error was generated while fetching, buffering and writing the file"
    );
  }

  var logoSettings = {
    position: "SE", // Position: NE NC NW SE SC SW C CE CW
    margin_nord: null, // Margin nord
    margin_sud: null, // Margin sud
    margin_east: null, // Margin east
    margin_west: null, // Margin west
  };
  try {
    await new ffmpeg(internet_downloaded_video).then(async (value) => {
      console.log("adding watermark");
      await value.fnAddWatermark(
        watermarkPath,
        watermarked_video,
        logoSettings
      );
    });
  } catch (e) {
    console.log("Error was generated while adding noody logo to video");
  }

  // deletes any existing video so we can replace it
  //fs.unlinkSync(watermarked_video);\\

  // fs.writeFileSync("out.png", text2png("ShahzadUmarBaig", { color: "yellow" }));
  try {
    return new Promise((resolve, reject) => {
      console.log("reached promise");
      fluent_ffmpeg(__dirname + "\\" + watermarked_video)
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
        .output(username.split(" ").join("_") + "_converted.mp4")
        .on("end", function () {
          resolve();
        })
        .on("error", function (err) {
          reject();
        })
        .run();
    });
  } catch (e) {
    console.log("Error was generated while adding text to video");
  }
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
