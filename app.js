const express     = require('express');
const multer      = require('multer');
const axios       = require('axios');
const { v4: uuid }= require('uuid');
const fs          = require('fs');
const fsp         = require('fs').promises;
const path        = require('path');
const { renderVideo } = require('./renderer.js');

const app    = express();
const upload = multer({ dest: 'uploads/' });
const PORT   = process.env.PORT || 3000;

// parse JSON & urlencoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1) Expose outputs/ under /videos
const outputsDir = path.join(__dirname, 'outputs');
if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir);
app.use('/videos', express.static(outputsDir));

app.post(
  '/render',
  upload.single('audio'),
  async (req, res) => {
    console.log("[app] /render POST hit");
    try {
      // ─── IMAGE ────────────────────────────
      let imagePath;
      if (req.body.imageUrl) {
        const url     = req.body.imageUrl;
        const ext     = path.extname(new URL(url).pathname) || '.jpg';
        const tmpName = `img-${uuid()}${ext}`;
        const tmpPath = path.join('uploads', tmpName);
        console.log("[app] Downloading image from URL", url);
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        await fsp.writeFile(tmpPath, response.data);
        console.log("[app] Image downloaded to", tmpPath);
        imagePath = tmpPath;
      } else {
        return res.status(400).send('Must provide imageUrl');
      }

      // ─── AUDIO ────────────────────────────
      let audioPath;
      if (req.body.audioUrl) {
        const url     = req.body.audioUrl;
        const ext     = path.extname(new URL(url).pathname) || '.mp3';
        const tmpName = `aud-${uuid()}${ext}`;
        const tmpPath = path.join('uploads', tmpName);
        console.log("[app] Downloading audio from URL", url);
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        await fsp.writeFile(tmpPath, response.data);
        console.log("[app] Audio downloaded to", tmpPath);
        audioPath = tmpPath;
      }
      else if (req.file) {
        audioPath = req.file.path;
        console.log("[app] Received uploaded audio file", audioPath);
      }
      else {
        return res.status(400).send('Must provide audioUrl or upload audio');
      }

      // ─── RENDER ───────────────────────────
      const filename = `${Date.now()}.mp4`;
      const outPath  = path.join(outputsDir, filename);

      console.log("[app] Calling renderVideo");
      const buffer = await renderVideo({ imagePath, audioPath });
      console.log("[app] renderVideo completed");

      console.log("[app] Writing output file to disk", outPath);
      fs.writeFileSync(outPath, buffer);

      // ─── CLEANUP UPLOADS ───────────────────
      await Promise.all([ fsp.unlink(imagePath), fsp.unlink(audioPath) ])
        .catch(e => console.error("[app] Cleanup error:", e));

      // 2) Build public URL and respond
      const url = `${req.protocol}://${req.get('host')}/videos/${filename}`;
      console.log("[app] Responding with URL", url);
      res.json({ url });
    }
    catch (err) {
      console.error("[app] Error in /render:", err);
      res.status(500).send('Rendering failed');
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
