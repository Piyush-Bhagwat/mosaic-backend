'use strict'
const sharp = require("sharp");
const fs = require("fs");
const _path = require("path");

//global variables
let originalWidth, originalHeight;
let smallImages = [],
    rawSmallImages = [];

let smallImageSize = 80;
let bigImageSize = 1080;

let colorOutputPath = "/output/color";
let grayOutputPath = "/output/gray";
let overlayPath = "/output/overlay";

let fileName = "";
let pathToreturn;
let mosaicPath;
let resolutionMultiplier = 1;

sharp({
    limits: {
        pixels: 9000000, // adjust this value to your needs
        filesize: 9000000,
    },
});

const getPixelatedImage = async (inputImagePath, pixelationFactor) => {
    console.log("Pixelating Hero Image...");
    try {
        // Fetch the metadata of the input image
        let metadata = await sharp(inputImagePath)
            .resize(bigImageSize, null)
            .toBuffer();
        metadata = await sharp(metadata).metadata();

        // Calculate the new dimensions for resizing
        originalWidth = metadata.width;
        originalHeight = metadata.height;

        // Pixelate the image using Sharp
        await sharp(inputImagePath)
            .resize(
                Math.ceil(originalWidth / pixelationFactor),
                Math.ceil(originalHeight / pixelationFactor),
                {
                    kernel: "nearest", // You can also use 'cubic' for smoother pixelation
                }
            )
            .toFile("./src/assets/pixelated.jpg");

        console.log(
            "-> Image pixelated and saved successfully",
            Math.ceil(originalWidth),
            originalHeight
        );
    } catch (err) {
        console.error("!! Error pixelating image:", err);
    }
};

const getPixelBrightness = async (inputImagePath) => {
    console.log("Calculating pixel Brightness...");
    try {
        // Read the input image
        const image = await sharp(inputImagePath)
            .raw()
            .toBuffer({ resolveWithObject: true });

        // Extract brightness values from the image
        const brightnessArray = [];

        for (let i = 0; i < image.data.length; i += 3) {
            // Extract R, G, B values from the pixel
            const r = image.data[i];
            const g = image.data[i + 1];
            const b = image.data[i + 2];

            // Calculate brightness using a simple formula
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

            // Store the brightness value in the array
            brightnessArray.push(parseFloat(brightness.toFixed(3)));
        }

        console.log("-> Pixel brightness Calculated");
        return brightnessArray;
    } catch (err) {
        console.error("Error processing image:", err);
        return null;
    }
};

const getPixelColor = async (inputImagePath) => {
    console.log("Calculating pixel Color...");
    try {
        // Read the input image
        const image = await sharp(inputImagePath)
            .raw()
            .toBuffer({ resolveWithObject: true });

        // Extract brightness values from the image
        const colorArray = [];

        for (let i = 0; i < image.data.length; i += 3) {
            // Extract R, G, B values from the pixel
            const r = image.data[i];
            const g = image.data[i + 1];
            const b = image.data[i + 2];

            // Calculate brightness using a simple formula
            const color = { r, g, b };

            // Store the brightness value in the array
            colorArray.push(color);
        }

        console.log("-> Pixel Color Calculated");
        return colorArray;
    } catch (err) {
        console.error("Error processing image:", err);
        return null;
    }
};

const loadSmallImages = async (folderPath) => {
    console.log("Loading small images...");

    try {
        // Read the list of files in the folder
        const fileNames = fs.readdirSync(folderPath);
        console.log("loading from-->", folderPath);

        // Array to store the processed images
        const images = [];

        // Loop through each file and process the image
        for (const fileName of fileNames) {
            const imagePath = `${folderPath}/${fileName}`;

            // Process the image using sharp and add it to the array
            const imageBuffer = await sharp(imagePath)
                .resize(600, null)
                .toBuffer();
            const rawImageBuffer = await sharp(imagePath)
                .resize(600, null)
                .raw()
                .toBuffer();

            rawSmallImages.push({
                fileName,
                buffer: rawImageBuffer,
            });

            images.push({
                fileName,
                buffer: imageBuffer,
            });
        }

        // Now, 'images' array contains objects with the file name and corresponding image buffer
        console.log("-> small Images loaded successfully");

        return images;
    } catch (error) {
        console.error("!! Error loading images:", error);
    }
};

const getAverageBrightness = async (buffer, skipPixels = 100) => {
    if (typeof buffer === "string") {
        buffer = await sharp(buffer).raw().toBuffer();
        console.log(buffer.length);
    }

    let totalBrightness = 0;
    let skippedPixels = 0;

    // Loop through each pixel (assuming 3 components per pixel: R, G, B)
    for (let i = 0; i < buffer.length - 3; i += 3 * skipPixels) {
        const r = buffer[i];
        const g = buffer[i + 1];
        const b = buffer[i + 2];

        // Calculate brightness using a simple formula
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

        // Accumulate the brightness values
        totalBrightness += brightness;

        skippedPixels++;
    }

    // Calculate the average brightness
    const averageBrightness = totalBrightness / skippedPixels;
    return parseFloat(averageBrightness.toFixed(3));
};

const getSmallImageBrightness = async (rootPath) => {
    console.log("Calculating Average Brightness...");

    try {
        const images = await loadSmallImages(_path.join(rootPath, "/small"));
        const brightnessArray = [];
        smallImages = images;

        await Promise.all(
            rawSmallImages.map(async ({ fileName, buffer }) => {
                const averageBrightness = await getAverageBrightness(buffer);
                brightnessArray.push(averageBrightness);
            })
        );
        console.log("-> Average Brightness Calculated");
        return brightnessArray;
    } catch (error) {
        console.error("Error calculating Avg Brightness:", error);
        return null;
    }
};

const getAverageColor = async (image) => {
    try {
        // Initialize variables to store the sum of color components
        let sumRed = 0;
        let sumGreen = 0;
        let sumBlue = 0;
        // console.log(image.length);
        // Iterate over each pixel
        for (let i = 0; i < image.length; i += 3) {
            // Extract R, G, B values from the pixel
            const r = image[i];
            const g = image[i + 1];
            const b = image[i + 2];

            // Accumulate the color values
            sumRed += r;
            sumGreen += g;
            sumBlue += b;
        }

        // Calculate the average color
        const numPixels = image.length / 3;
        const averageRed = Math.round(sumRed / numPixels);
        const averageGreen = Math.round(sumGreen / numPixels);
        const averageBlue = Math.round(sumBlue / numPixels);

        return {
            r: averageRed,
            g: averageGreen,
            b: averageBlue,
        };
    } catch (err) {
        console.error("Error calculating average color:", err);
        return null;
    }
};

const getSmallAverageColor = async (rootPath) => {
    try {
        const images = await loadSmallImages(_path.join(rootPath, "/small"));
        const colorArray = [];
        smallImages = images;

        await Promise.all(
            rawSmallImages.map(async ({ fileName, buffer }) => {
                const averageColor = await getAverageColor(buffer);
                colorArray.push(averageColor);
            })
        );
        console.log("-> Average Brightness Calculated");
        return colorArray;
    } catch (er) {
        console.log("!! Failed to Calculate Aerage Color", er);
    }
};

const crop = async (buffer) => {
    // buffer = await sharp("./src/assets/pixelated.jpg").toBuffer();

    try {
        const metadata = await sharp(buffer).metadata();
        const squareSize = Math.min(metadata.width, metadata.height);
        // const squareSize = 10;
        const left = Math.floor((metadata.width - squareSize) / 2);
        const top = Math.floor((metadata.height - squareSize) / 2);

        // Use await to ensure the sharp operations are completed before returning the result
        let croppedBuffer = await sharp(buffer)
            .extract({
                left,
                top,
                width: squareSize,
                height: squareSize,
            })
            .resize(smallImageSize, smallImageSize, { kernel: "cubic" })
            .toBuffer();

        return croppedBuffer;
    } catch (err) {
        console.error("!! Error cropping image to square:", err);
        throw err; // Rethrow the error to handle it at the higher level if needed
    }
};

function findClosestBrightnessIndex(brightnessArray) {
    let closestIndex = 0;
    const brightness = [];

    for (let j = 0; j < 256; j++) {
        let minDifference = 256;
        for (let i = 0; i < brightnessArray.length; i++) {
            const difference = Math.abs(j - brightnessArray[i]);
            if (difference < minDifference) {
                minDifference = difference;
                closestIndex = i;
            }
        }
        brightness.push(closestIndex);
    }
    return brightness;
}

const generateMosaicGray = async (
    brightnessArray,
    averageBrightness,
    smallImages,
    mosaicWidth,
    mosaicHeight,
    pixelationFactor,
    randomness
) => {
    console.log("Generating Mosaic...", brightnessArray.length);

    try {
        let mosaicCanvas = sharp({
            create: {
                width: mosaicWidth,
                height: mosaicHeight,
                channels: 3,
                background: { r: 255, g: 255, b: 255 }, // Adjust background color
            },
        });

        let i = 0;
        const smallImagesByBriightness =
            findClosestBrightnessIndex(averageBrightness);

        let croppedImages = [];

        for (let i = 0; i < brightnessArray.length; i++) {
            const curPixelBirghtness = Math.floor(brightnessArray[i]);
            let imageIDX = smallImagesByBriightness[curPixelBirghtness];

            if (Math.random() < randomness) {
                //used this to add random bits
                imageIDX =
                    (imageIDX + Math.floor(Math.random() * 10)) %
                    smallImages.length;
            }

            const smallImageBuffer = smallImages[imageIDX].buffer;

            let croppedImage = await crop(smallImageBuffer);

            croppedImage = await sharp(croppedImage).grayscale().toBuffer();

            // Use sharp to composite images directly
            const left =
                (i % Math.ceil(originalWidth / pixelationFactor)) *
                smallImageSize;
            const top =
                Math.floor(i / Math.ceil(originalWidth / pixelationFactor)) *
                smallImageSize;

            croppedImages.push({
                input: croppedImage,
                left,
                top,
            });
            // console.log(left/smallImageSize, top/smallImageSize, imageIDX);
        }

        console.log("-> Mosaic Generated Successfully");
        mosaicCanvas.composite(croppedImages);
        return mosaicCanvas;
    } catch (er) {
        console.error("!! Error Creating Mosaic:", er);
    }
};

function findClosestColorIndex(targetColor, averageArray) {
    const colorDistance = (color1, color2) => {
        return Math.sqrt(
            Math.pow(color1.r - color2.r, 2) +
                Math.pow(color1.g - color2.g, 2) +
                Math.pow(color1.b - color2.b, 2)
        );
    };

    let closestIndex = 0;
    let minDistance = colorDistance(targetColor, averageArray[0]);

    for (let i = 1; i < averageArray.length; i++) {
        const distance = colorDistance(targetColor, averageArray[i]);
        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
        }
    }

    return closestIndex;
}

const generateMosaicColor = async (
    pixelColor,
    averageColor,
    smallImages,
    mosaicWidth,
    mosaicHeight,
    pixelationFactor,
    randomness
) => {
    console.log("Generating Mosaic...", pixelColor.length);

    try {
        let mosaicCanvas = sharp({
            create: {
                width: mosaicWidth,
                height: mosaicHeight,
                channels: 3,
                background: { r: 255, g: 255, b: 255 }, // Adjust background color
            },
        });

        let croppedImages = [];

        for (let i = 0; i < pixelColor.length; i++) {
            let closeIDX = findClosestColorIndex(pixelColor[i], averageColor);

            if (Math.random() < randomness) {
                //used this to add random bits
                closeIDX =
                    (closeIDX + Math.floor(Math.random() * 10)) %
                    smallImages.length;
            }

            const smallImageBuffer = smallImages[closeIDX].buffer;

            const croppedImage = await crop(smallImageBuffer);

            // Use sharp to composite images directly
            const left =
                (i % Math.ceil(originalWidth / pixelationFactor)) *
                smallImageSize;
            const top =
                Math.floor(i / Math.ceil(originalWidth / pixelationFactor)) *
                smallImageSize;

            croppedImages.push({
                input: croppedImage,
                left,
                top,
            });

            // await new Promise((resolve) => {
            //     setTimeout(resolve, 4);
            // });
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(
                `-> ${Math.ceil(100 * (i / pixelColor.length))}% done`
            );
        }

        console.log("-> Mosaic Generated Successfully");
        mosaicCanvas.composite(croppedImages);
        return mosaicCanvas;
    } catch (er) {
        console.error("!! Error Creating Mosaic:", er);
    }
};

const getMosaicGray = async (
    bigImagePath,
    pixelationFactor,
    rootPath,
    randomness
) => {
    try {
        const brightnessArray = await getPixelBrightness(
            "./src/assets/pixelated.jpg"
        ); // Step 2

        const averageBrightness = await getSmallImageBrightness(rootPath); // Step 3

        const mosaicWidth = Math.ceil(
            (originalWidth / pixelationFactor) * smallImageSize
        );
        const mosaicHeight = Math.ceil(
            (originalHeight / pixelationFactor) * smallImageSize
        );

        console.log("Mosiac Dimensions:", mosaicWidth, mosaicHeight);

        const mosaicCanvas = await generateMosaicGray(
            brightnessArray,
            averageBrightness,
            smallImages,
            mosaicWidth,
            mosaicHeight,
            pixelationFactor,
            randomness
        );
        mosaicPath = `${grayOutputPath}/${Date.now()}-mosaic-${fileName}`;

        await mosaicCanvas.toFile(mosaicPath);
        console.log("Mosaic Saved at path: ", mosaicPath);
        await greyMerge(bigImagePath, mosaicPath);
    } catch (er) {
        if (er) console.log("Somethings wrong: ", er);
    }
};

const getMosaicColor = async (
    bigImagePath,
    pixelationFactor,
    rootPath,
    randomness
) => {
    try {
        const pixelColor = await getPixelColor("./src/assets/pixelated.jpg");

        const averageColor = await getSmallAverageColor(rootPath); // Step 3

        const mosaicWidth = Math.ceil(
            (originalWidth / pixelationFactor) * smallImageSize
        );
        const mosaicHeight = Math.ceil(
            (originalHeight / pixelationFactor) * smallImageSize
        );

        console.log("Mosiac Dimensions:", mosaicWidth, mosaicHeight);

        const mosaicCanvas = await generateMosaicColor(
            pixelColor,
            averageColor,
            smallImages,
            mosaicWidth,
            mosaicHeight,
            pixelationFactor,
            randomness
        );
        mosaicPath = `${colorOutputPath}/${Date.now()}mosaic-${fileName}`;

        await mosaicCanvas.toFile(mosaicPath);
        console.log("Mosaic Saved at path: ", mosaicPath);

        await colorMerge(bigImagePath, mosaicPath);
    } catch (er) {
        if (er) console.log("Something wrong: ", er);
    }
};

const colorMerge = async (input, mosaic) => {
    //depreciated
    try {
        console.log("getting mosaic file from: ", input);
        const inputMeta = await sharp(input).metadata();
        const w = inputMeta.width * resolutionMultiplier;
        const h = inputMeta.height * resolutionMultiplier;

        const orignalImage = await sharp(input)
            .modulate({ brightness: 0.7 })
            .resize(w, h)
            .toBuffer();
        const mosaicGrid = await sharp(mosaic)
            .resize(w, h)   
            .ensureAlpha(0.8)
            .modulate({ brightness: 0.8 })
            .toBuffer();
        const savePath = `${overlayPath}/${Date.now()}-overlayColor-${fileName}`;

        console.log("saving Merge file to:", savePath);

        await sharp(orignalImage)
            .composite([{ input: mosaicGrid, blend: "screen" }])
            // .modulate({brightness: 1.4})
            .ensureAlpha(1)
            .toFile(savePath);

        pathToreturn = savePath;

        console.log("-> overlay genrated");
    } catch (er) {
        console.log("Error Merging files", er);
    }
};

const greyMerge = async (input, mosaic) => {
    try {
        console.log("getting mosaic file from: ", input);

        const inputMeta = await sharp(input).metadata();
        const w = inputMeta.width * resolutionMultiplier;
        const h = inputMeta.height * resolutionMultiplier;

        const orignalImage = await sharp(input)
            .resize(w, h)
            .grayscale()
            .toBuffer();
        const mosaicGrid = await sharp(mosaic)
            .resize(w, h)
            .ensureAlpha(0.7)
            .toBuffer();

        const savePath = `${overlayPath}/${Date.now()}-overlayGrey-${fileName}`;
        console.log("saving Merge file to:", savePath);

        await sharp(mosaicGrid)
            .composite([{ input: orignalImage, blend: "soft-light" }])
            .ensureAlpha(1)
            .grayscale()
            .toFile(savePath);
        pathToreturn = savePath;
        console.log("-> overlay genrated");
    } catch (er) {
        console.log("Error Merging files", er);
    }
};

const processImage = async (
    bigImagepPath,
    rootPath,
    pixelationFactor,
    isColor,
    resolution,
    randomness
) => {
    resolutionMultiplier = resolution;
    createOutputFolders(rootPath);

    const startTime = new Date();
    await getPixelatedImage(bigImagepPath, pixelationFactor); // Step 1

    fileName = bigImagepPath.split("\\").pop();

    if (isColor) {
        await getMosaicColor(
            bigImagepPath,
            pixelationFactor,
            rootPath,
            randomness
        );
    } else {
        await getMosaicGray(
            bigImagepPath,
            pixelationFactor,
            rootPath,
            randomness
        );
    }

    fs.rm("./src/assets/pixelated.jpg", () => {});
    const endTime = new Date();

    console.log("Time Taken(s): ", Math.floor((endTime - startTime) / 1000));
    return { path: pathToreturn, mosaicPath };
};

const createOutputFolders = async (rootPath) => {
    try {
        if (colorOutputPath !== _path.join(rootPath, "/output/color")) {
            colorOutputPath = _path.join(rootPath, colorOutputPath);
            grayOutputPath = _path.join(rootPath, grayOutputPath);
            overlayPath = _path.join(rootPath, overlayPath);
        }

        // console.log(colorOutputPath, grayOutputPath, overlayPath, rootPath);

        if (!fs.existsSync(_path.join(rootPath, "/output"))) {
            fs.mkdirSync(_path.join(rootPath, "/output"));
        }
        if (!fs.existsSync(colorOutputPath)) {
            fs.mkdirSync(colorOutputPath);
        }
        if (!fs.existsSync(grayOutputPath)) {
            fs.mkdirSync(grayOutputPath);
        }
        if (!fs.existsSync(overlayPath)) {
            fs.mkdirSync(overlayPath);
        }
    } catch (er) {
        console.log("Error creating Output Folders:", er);
    }
};

module.exports = {
    processImage,
};
