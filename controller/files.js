const path = require("path");
const fs = require("fs");
const { processImage } = require("../utils/mosicMain");

//global var
var bigImageName;

const getImages = async (uploadFolder, smallImages, bigImage) => {
    if (!fs.existsSync(path.join(uploadFolder, "small"))) {
        fs.mkdirSync(path.join(uploadFolder, "small"));
    }
    if (!fs.existsSync(path.join(uploadFolder, "big"))) {
        fs.mkdirSync(path.join(uploadFolder, "big"));
    }

    const bigFileName = bigImage.originalname;
    bigImageName = Date.now() + bigFileName;
    const bigFilePath = path.join(uploadFolder, "big", bigImageName);

    fs.writeFileSync(bigFilePath, bigImage.buffer);

    await Promise.all(
        smallImages.map(async (file) => {
            const fileName = Date.now() + file.originalname;
            const filePath = path.join(uploadFolder, "small", fileName);

            fs.writeFileSync(filePath, file.buffer);
        })
    );
};

const getMosaic = async (
    uploadFolder,
    smallImages,
    bigImage,
    pixelationFactor,
    isColor,
    resolution
) => {
    try {
        await getImages(uploadFolder, smallImages, bigImage);
        const inputImagePath = path.join(uploadFolder, "/big/", bigImageName);

        const data = await processImage(
            inputImagePath,
            uploadFolder,
            pixelationFactor,
            isColor,
            resolution
        );

        return data;
    } catch (er) {
        console.log("Error getting Mosaic", er);
    }
};

module.exports = {
    getImages,
    getMosaic,
};
