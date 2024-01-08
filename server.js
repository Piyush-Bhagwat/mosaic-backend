const cors = require("cors");
const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const multer = require("multer");
const { getMosaic } = require("./controller/files");
const app = express();
app.use(bodyParser.raw({ type: "image/*", limit: "10mb" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Input image file path

const PORT = 5000;

const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage: storage });

const uploadFolder = path.join(__dirname, "/assets");
const cleanfolders = () => {
    if (fs.existsSync(uploadFolder)) {
        fs.rmSync(uploadFolder, {
            recursive: true,
            force: true,
        });
    }
    if (!fs.existsSync(uploadFolder)) {
        fs.mkdirSync(uploadFolder);
    }
    fs.rmSync(path.join(uploadFolder, "small"), {
        recursive: true,
        force: true,
    });
    fs.rmSync(path.join(uploadFolder, "big"), {
        recursive: true,
        force: true,
    });
}


cleanfolders();


app.use('/static', express.static(path.join(__dirname, 'assets/output')));
app.use('/public', express.static(path.join(__dirname, "public")));

app.get("/app", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post(
    "/getMosaic",
    upload.fields([
        { name: "files", maxCount: 80 },
        { name: "file", maxCount: 1 },
    ]),
    async (req, res) => {
        try {
            const pixelation = parseInt(req.body.pixelation);
            const size = parseInt(req.body.size);
            const mode = req.body.mode.length === 2? 0 : 1; //thats weird but its correct
            const smallImages = req.files["files"];
            const bigImage = req.files["file"] ? req.files["file"][0] : null;

            if (!smallImages || smallImages.length === 0 || !bigImage) {
                return res.status(400).send("No files attached");
            }

            const imagePath = await getMosaic(
                uploadFolder,
                smallImages,
                bigImage,
                pixelation,
                mode,
                size
            );
            const relativePath = imagePath.path.replace(path.join(__dirname, "assets", "output"), '').replace(/\\/g, '/');
            const mosaicPath = imagePath.mosaicPath.replace(path.join(__dirname, "assets", "output"), '').replace(/\\/g, '/');

            res.send({overlayPath: relativePath, mosaicPath});
        } catch (error) {
            console.error("Error processing files:", error);
            res.status(500).send("Internal Server Error");
        }
    }
);

app.listen(PORT, () => {
    console.log("Server running on: ", PORT);
    console.log(`Start App: http://localhost:${PORT}/app`, );
});

