const path = require("path");
const fs = require("fs");
const { processImage } = require("../utils/mosicMain");
const sharp = require("sharp");
const { uploadMosaic, getURL } = require("../DB/FBInit");

//global var
var bigImageName;

const getImages = async (uploadFolder, smallImages, bigImage) => {
    fs.rmSync(path.join(uploadFolder, "small"), {
        recursive: true,
        force: true,
    });
    fs.rmSync(path.join(uploadFolder, "big"), {
        recursive: true,
        force: true,
    });

    fs.mkdirSync(path.join(uploadFolder, "small"));
    fs.mkdirSync(path.join(uploadFolder, "big"));

    const bigFileName = bigImage.originalname;
    bigImageName = bigFileName;
    const bigFilePath = path.join(uploadFolder, "big", bigFileName);

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
        
        console.log("-->Uploading to cloud")
        const loaclPath = data.path;
        const mosaic = await sharp(loaclPath).toBuffer();

        await uploadMosaic(mosaic, `mosaic-${bigImageName}`).then(() =>
            console.log("-->Uploaded to cloud")
        );

        const imageURL = await getURL(`mosaic-${bigImageName}`);
        console.log(imageURL);

        return { url: imageURL, tt: data.tt };
    } catch (er) {
        console.log("Error getting Mosaic", er);
    }
};

module.exports = {
    getImages,
    getMosaic,
};
