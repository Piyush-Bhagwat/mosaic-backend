const path = require("path");
const fs = require("fs");
const { processImage } = require("../utils/mosicMain");
const { Mosaic } = require("../utils/classBasedMosaic");

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
            const fileName = file.originalname;
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
    resolution,
    randomness
) => {
    try {
        await getImages(uploadFolder, smallImages, bigImage);
        const inputImagePath = path.join(uploadFolder, "/big/", bigImageName);
        const mosaicCreator = new Mosaic({
            rootPath: uploadFolder,
            bigImageName,
            pixelation: pixelationFactor,
            randomness,
            isColor,
            resolution,
        });

        const data = await mosaicCreator.processImage(
            inputImagePath,
            uploadFolder,
            pixelationFactor,
            isColor,
            resolution,
            randomness
        );
        // const data = await processImage(
        //     inputImagePath,
        //     uploadFolder,
        //     pixelationFactor,
        //     isColor,
        //     resolution,
        //     randomness
        // );

        return { ...data, name: bigImageName };
    } catch (er) {
        console.log("Error getting Mosaic", er);
    }
};

module.exports = {
    getImages,
    getMosaic,
};
