const cors = require("cors");
const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const multer = require("multer");
const { getMosaic } = require("./controller/files");
const { initFireBase } = require("./DB/FBInit");
const app = express();
app.use(bodyParser.raw({ type: "image/*", limit: "10mb" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Input image file path

const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage: storage });

const uploadFolder = path.join(__dirname, "/assets");

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



app.use('/static', express.static(path.join(__dirname, 'assets/output')));
app.use('/public', express.static(path.join(__dirname, "public")));
app.get("/app", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post(
    "/getMosaic",
    upload.fields([
        { name: "files", maxCount: 40 },
        { name: "file", maxCount: 1 },
    ]),
    async (req, res) => {
        try {
            const uid = req.body;
            console.log("small->", req.body.files);
            const smallImages = req.files["files"];
            const bigImage = req.files["file"] ? req.files["file"][0] : null;

            if (!smallImages || smallImages.length === 0 || !bigImage) {
                return res.status(400).send("No files attached");
            }

            const imagePath = await getMosaic(
                uploadFolder,
                smallImages,
                bigImage,
                50,
                true,
                1
            );
            const relativePath = imagePath.path.replace(path.join(__dirname, "assets", "output"), '').replace(/\\/g, '/');
            res.send({path: relativePath, tt: imagePath.tt});
        } catch (error) {
            console.error("Error processing files:", error);
            res.status(500).send("Internal Server Error");
        }
    }
);

app.listen(5000, () => {
    initFireBase();
    console.log("Server running on: ", 5000);
});
