const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');
const { renderVideo } = require('./renderer.js');

const app    = express();
const upload = multer({ dest: 'uploads/' });
const PORT   = process.env.PORT || 3000;

app.post(
  '/render',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
  ]),
  async (req, res) => {
    console.log("[app] /render POST hit");
    try {
      const imgPath   = req.files.image[0].path;
      const audioPath = req.files.audio[0].path;
      console.log("[app] Received files", { imgPath, audioPath });

      const outDir = 'outputs';
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
      const outPath = path.join(outDir, `${Date.now()}.mp4`);

      console.log("[app] Calling renderVideo");
      const data = await renderVideo({ imagePath: imgPath, audioPath });
      console.log("[app] renderVideo completed");

      fs.writeFileSync(outPath, data);
      console.log("[app] Output written to", outPath);

      res.download(outPath, 'output.mp4', err => {
        if (err) console.error(err);
        // cleanup
        [imgPath, audioPath, outPath].forEach(file => {
          fs.unlink(file, err => err && console.error(err));
        });
        console.log("[app] Cleanup done");
      });
    } catch (err) {
      console.error("[app] Error in /render:", err);
      res.status(500).send('Rendering failed');
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
