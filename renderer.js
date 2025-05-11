const { spawn } = require("child_process");
const path = require("path");

async function renderVideo({ imagePath, audioPath }) {
  console.log("[renderer] renderVideo: start", { imagePath, audioPath });

  const outputPath = path.join("outputs", `${Date.now()}_output.mp4`);
  const args = [
    "-loop", "1",               // loop the image
    "-i", imagePath,            // input image
    "-i", audioPath,            // input audio
    "-t", "15",                 // set video length to 15 seconds
    // "-filter:v", "scale=720:1280", // resize to 720p
    "-c:v", "libx264",          // video codec
    "-c:a", "aac",              // audio codec
    "-pix_fmt", "yuv420p",      // compatible pixel format
    "-shortest",                // stop encoding when the shortest stream ends
    "-y",                       // overwrite output
    outputPath                  // output file
  ];

  console.log("[renderer] Running ffmpeg with args:", args.join(" "));

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args);

    ffmpeg.stdout.on("data", data => console.log(`[ffmpeg stdout] ${data}`));
    ffmpeg.stderr.on("data", data => console.error(`[ffmpeg stderr] ${data}`));

    ffmpeg.on("close", code => {
      if (code === 0) {
        console.log("[renderer] FFmpeg finished successfully");
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });
}

module.exports = { renderVideo };
