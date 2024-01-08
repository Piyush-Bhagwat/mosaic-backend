const sharp = require("sharp");
const fs = require("fs");
const _path = require("path")

//global variables
var originalWidth, originalHeight;
var smallImages = [],
    rawSmallImages = [];

var smallImageSize = 100;
var bigImageSize = 1080;

var colorOutputPath = "/output/color";
var grayOutputPath = "/output/gray";
var overlayPath = "/output/overlay";

var fileName = "";
var pathToreturn;
var resolutionMultiplier = 1;

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
        const pixelImg = await sharp(inputImagePath)
            .resize(
                Math.ceil(originalWidth / pixelationFactor),
                Math.ceil(originalHeight / pixelationFactor),
                {
                    kernel: "nearest", // You can also use 'cubic' for smoother pixelation
                }
            )
            .toFile("./assets/pixelated.jpg");

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
    // buffer = await sharp("./assets/pixelated.jpg").toBuffer();

    try {
        const metadata = await sharp(buffer).metadata();
        const squareSize = Math.min(metadata.width, metadata.height);
        // const squareSize = 10;
        const left = Math.floor((metadata.width - squareSize) / 2);
        const top = Math.floor((metadata.height - squareSize) / 2);

        // Use await to ensure the sharp operations are completed before returning the result
        var croppedBuffer = await sharp(buffer)
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
    pixelationFactor
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
            const imageIDX = smallImagesByBriightness[curPixelBirghtness];
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
    pixelationFactor
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
            const closeIDX = findClosestColorIndex(pixelColor[i], averageColor);

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

            // console.log("-> Mosaic Updated Successfully");
        }

        console.log("-> Mosaic Generated Successfully");
        mosaicCanvas.composite(croppedImages);
        return mosaicCanvas;
    } catch (er) {
        console.error("!! Error Creating Mosaic:", er);
    }
};

const getMosaicGray = async (bigImagePath, pixelationFactor, rootPath) => {
    const brightnessArray = await getPixelBrightness("./assets/pixelated.jpg"); // Step 2

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
        pixelationFactor
    );

    await mosaicCanvas.toFile(`${grayOutputPath}/mosaic-${fileName}`);
    await greyMerge(bigImagePath, `${grayOutputPath}/mosaic-${fileName}`);
    console.log("finished: ", `${grayOutputPath}/mosaic-${fileName}`);
};

const getMosaicColor = async (bigImagePath, pixelationFactor, rootPath) => {
    const pixelColor = await getPixelColor("./assets/pixelated.jpg");

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
        pixelationFactor
    );

    // Convert the mosaicCanvas object to a Buffer
    const mosaicBuffer = await mosaicCanvas.toBuffer();

    await mosaicCanvas.toFile(`${colorOutputPath}/mosaic-${fileName}`);
    await colorMerge(bigImagePath, `${colorOutputPath}/mosaic-${fileName}`);
    console.log("finishaed", `${colorOutputPath}/mosaic-${fileName}`);
};

const colorMerge = async (input, mosaic) => {
    const inputMeta = await sharp(input).metadata();
    const w = inputMeta.width*resolutionMultiplier;
    const h = inputMeta.height*resolutionMultiplier;
    
    const img1 = await sharp(input).resize(w, h).ensureAlpha(0.4).toBuffer();
    const img2 = await sharp(mosaic).resize(w, h).toBuffer();
    const savePath = `${overlayPath}/overlayColor-${fileName}`;
    await sharp(img1)
        .composite([{ input: img2, blend: "overlay" }])
        .modulate({ brightness: 2 })
        .toFile(savePath);

    pathToreturn = savePath;
};

const greyMerge = async (input, mosaic) => {
    const inputMeta = await sharp(input).metadata();
    const w = inputMeta.width*resolutionMultiplier;
    const h = inputMeta.height*resolutionMultiplier;
    
    const img1 = await sharp(input).resize(w, h).ensureAlpha(0.4).toBuffer();
    const img2 = await sharp(mosaic).resize(w, h).toBuffer();

    const savePath = `${overlayPath}/overlayGrey-${fileName}`;
    await sharp(img1)
        .composite([{ input: img2, blend: "overlay" }])
        .modulate({ brightness: 2 })
        .grayscale()
        .toFile(savePath);
    pathToreturn = savePath;
};

const processImage = async (bigImagepPath, rootPath, pixelationFactor, isColor, resolution) => {
    resolutionMultiplier = resolution;
    createOutputFolders(rootPath);

    const startTime = new Date();
    await getPixelatedImage(bigImagepPath, pixelationFactor); // Step 1

    fileName = bigImagepPath.split("/").pop();

    if (isColor) {
        await getMosaicColor(bigImagepPath, pixelationFactor, rootPath);
    } else {
        await getMosaicGray(bigImagepPath, pixelationFactor, rootPath);
    }

    fs.rm("./assets/pixelated.jpg", () => {});
    const endTime = new Date();

    console.log("Time Taken(s): ", Math.floor((endTime - startTime) / 1000));
    return {path: pathToreturn, tt:  Math.floor((endTime - startTime) / 1000)};
};

const createOutputFolders = async (rootPath) => {
    colorOutputPath = _path.join(rootPath, colorOutputPath);
    grayOutputPath = _path.join(rootPath, grayOutputPath);
    overlayPath = _path.join(rootPath, overlayPath);

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
}

module.exports = {
    processImage,
};
