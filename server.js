const fs = require("fs");
const { writeFile } = require("fs");
const { promisify } = require("util");
var fluent_ffmpeg = require("fluent-ffmpeg");
const fetch = require("node-fetch");
const express = require("express");
var app = express();
var bodyParser = require("body-parser");
var glob = require("glob");

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

      // await createWatermark(req.params.username, videoURL).then((value) => {
      //   console.log(value);
      //   readStream = fs.createReadStream(
      //     req.params.username.split(" ").join("_") + "_converted.mp4"
      //   );
      //   console.log("Opened ReadStream");
      //   return readStream.pipe(res).on("finish", () => {
      //     console.log("Sent the Response");
      //     deleteFiles(req.params.username);
      //     readStream.close();
      //   });
      // });
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
  var watermarkPath = "new_logo.PNG";
  var watermarked_video =
    username.split(" ").join("_") + "_watermarked_video.mp4";

  if (fs.existsSync(__dirname + "\\" + internet_downloaded_video)) {
    console.log(true);
  } else {
    console.log(false);
  }

  return new Promise((resolve, reject) => {
    fluent_ffmpeg()
      .input(__dirname + "\\" + internet_downloaded_video)
      .addInput(__dirname + "\\" + watermarkPath)
      .videoCodec("libx264")
      .outputOptions("-pix_fmt yuv420p")
      .complexFilter(["overlay=0:H-h-10"])
      .output(__dirname + "\\" + watermarked_video)
      .on("end", function () {
        resolve();
      })
      .on("error", function (err) {
        reject();
      })
      .run();
  });
}

async function addUsername(username) {
  var watermarked_video =
    username.split(" ").join("_") + "_watermarked_video.mp4";
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
}

// async function createWatermark(username, videoURL) {
//   console.log("createdWaterMark Started");
//   var watermarkPath = "new_logo.png";
//   var internet_downloaded_video =
//     username.split(" ").join("_") + "_raw_video.mp4";
//   var internet_video_link = videoURL;
//   var watermarked_video =
//     username.split(" ").join("_") + "_watermarked_video.mp4";
//   console.log(username.split(" ").join("_"));
//   console.log(internet_video_link);

//   var logoSettings = {
//     position: "SE", // Position: NE NC NW SE SC SW C CE CW
//     margin_nord: null, // Margin nord
//     margin_sud: null, // Margin sud
//     margin_east: null, // Margin east
//     margin_west: null, // Margin west
//   };
//   try {
//     await new ffmpeg(internet_downloaded_video).then(async (value) => {
//       console.log("adding watermark");
//       await value.fnAddWatermark(
//         watermarkPath,
//         watermarked_video,
//         logoSettings
//       );
//     });
//   } catch (e) {
//     console.log("Error was generated while adding noody logo to video");
//   }

//   // deletes any existing video so we can replace it
//   //fs.unlinkSync(watermarked_video);\\

//   // fs.writeFileSync("out.png", text2png("ShahzadUmarBaig", { color: "yellow" }));
//   try {
//   } catch (e) {
//     console.log("Error was generated while adding text to video");
//   }
//}

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
