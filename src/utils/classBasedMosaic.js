const sharp = require("sharp");
const fs = require("fs");
const _path = require("path");

sharp({
    limits: {
        pixels: 9000000, // adjust this value to your needs
        filesize: 9000000,
    },
});

class Mosaic {
    constructor({rootPath, bigImageName, pixelation, randomness, isColor, resolution}) {
        this.rootPath = rootPath;
        this.bigImagePath = `${rootPath}/big/${bigImageName}`;
        this.smallImagesPath = `${rootPath}/small`;
        this.pixelatedPath = `${rootPath}/pixel.jpg`
        this.fileName = bigImageName;

        this.originalWidth = 0;
        this.originalHeight = 0;

        this.smallImages = [];
        this.rawSmallImages = [];

        this.smallImageSize = 80;
        this.bigImageSize = 1080;

        this.colorOutputPath = `${rootPath}/output/color`;
        this.grayOutputPath = `${rootPath}/output/gray`;
        this.overlayPath = `${rootPath}/output/overlay`;

        this.pathToreturn = ""
        this.mosaicPath=""

        this.resolutionMultiplier = resolution;
        this.pixelationFactor = pixelation;
        this.randomness = randomness;
        this.isColor = isColor;
    }

    async getPixelatedImage() {
        console.log("Pixelating Hero Image...");
        try {
            // Fetch the metadata of the input image
            let metadata = await sharp(this.bigImagePath)
                .resize(this.bigImageSize, null)
                .toBuffer();
            metadata = await sharp(metadata).metadata();
    
            // Calculate the new dimensions for resizing
            this.originalWidth = metadata.width;
            this.originalHeight = metadata.height;
    
            // Pixelate the image using Sharp
            await sharp(this.bigImagePath)
                .resize(
                    Math.ceil(this.originalWidth / this.pixelationFactor),
                    Math.ceil(this.originalHeight / this.pixelationFactor),
                    {
                        kernel: "nearest", // You can also use 'cubic' for smoother pixelation
                    }
                )
                .toFile(this.pixelatedPath);
    
            console.log(
                "-> Image pixelated and saved successfully",
                Math.ceil(this.originalWidth),
                this.originalHeight
            );
        } catch (err) {
            console.error("!! Error pixelating image:", err);
        }
    };

    async loadSmallImages() {
        console.log("Loading small images...");
    
        try {
            // Read the list of files in the folder
            const fileNames = fs.readdirSync(this.smallImagesPath);
            console.log("loading from-->", this.smallImagesPath);
    
            // Loop through each file and process the image
            for (const fileName of fileNames) {
                const imagePath = `${this.smallImagesPath}/${fileName}`;
                // Process the image using sharp and add it to the array
                const imageBuffer = await sharp(imagePath)
                    .resize(600, null)
                    .toBuffer();
                const rawImageBuffer = await sharp(imagePath)
                    .resize(600, null)
                    .raw()
                    .toBuffer();
    
                this.rawSmallImages.push({
                    fileName,
                    buffer: rawImageBuffer,
                });
    
                this.smallImages.push({
                    fileName,
                    buffer: imageBuffer,
                });

                console.log("Filer loaded->", imagePath);
            }
    
            // Now, 'images' array contains objects with the file name and corresponding image buffer
            console.log("-> small Images loaded successfully");
        } catch (error) {
            console.error("!! Error loading images:", error);
        }
    };

    async getPixelBrightness() {
        console.log("Calculating pixel Brightness...");
        try {
            // Read the input image
            const image = await sharp(this.pixelatedPath)
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

    async getPixelColor() {
        console.log("Calculating pixel Color...");
        try {
            // Read the input image
            const image = await sharp(this.pixelatedPath)
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

    async getAverageBrightness(buffer, skipPixels = 100) {
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

    async getSmallImageBrightness() {
        console.log("Calculating Average Brightness...");
    
        try {
            await this.loadSmallImages();
            const brightnessArray = [];
    
            await Promise.all(
                this.rawSmallImages.map(async ({ fileName, buffer }) => {
                    const averageBrightness = await this.getAverageBrightness(buffer);
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

    async getAverageColor(image){
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

    async getSmallAverageColor(){
        try {
            await this.loadSmallImages(this.smallImagesPath);
            const colorArray = [];
    
            await Promise.all(
                this.rawSmallImages.map(async ({ fileName, buffer }) => {
                    const averageColor = await this.getAverageColor(buffer);
                    colorArray.push(averageColor);
                })
            );
            console.log("-> Average Brightness Calculated");
            return colorArray;
        } catch (er) {
            console.log("!! Failed to Calculate Aerage Color", er);
        }
    };
    
    async crop (buffer) {
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
                .resize(this.smallImageSize, this.smallImageSize, { kernel: "cubic" })
                .toBuffer();
    
            return croppedBuffer;
        } catch (err) {
            console.error("!! Error cropping image to square:", err);
            throw err; // Rethrow the error to handle it at the higher level if needed
        }
    };

    findClosestBrightnessIndex(brightnessArray) {
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

    async generateMosaicGray (
        brightnessArray,
        averageBrightness,
        mosaicWidth,
        mosaicHeight,
    ) {
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
                this.findClosestBrightnessIndex(averageBrightness);
    
            let croppedImages = [];
    
            for (let i = 0; i < brightnessArray.length; i++) {
                const curPixelBirghtness = Math.floor(brightnessArray[i]);
                let imageIDX = smallImagesByBriightness[curPixelBirghtness];
    
                if (Math.random() < this.randomness) {
                    //used this to add random bits
                    imageIDX =
                        (imageIDX + Math.floor(Math.random() * 10)) %
                        this.smallImages.length;
                }
    
                const smallImageBuffer = this.smallImages[imageIDX].buffer;
    
                let croppedImage = await this.crop(smallImageBuffer);
    
                croppedImage = await sharp(croppedImage).grayscale().toBuffer();
    
                // Use sharp to composite images directly
                const left =
                    (i % Math.ceil(this.originalWidth / this.pixelationFactor)) *
                    this.smallImageSize;
                const top =
                    Math.floor(i / Math.ceil(this.originalWidth / this.pixelationFactor)) *
                    this.smallImageSize;
    
                croppedImages.push({
                    input: croppedImage,
                    left,
                    top,
                });
            }
    
            console.log("-> Mosaic Generated Successfully");
            mosaicCanvas.composite(croppedImages);
            return mosaicCanvas;
        } catch (er) {
            console.error("!! Error Creating Mosaic:", er);
        }
    };

    async getMosaicGray (){
        try {
            const brightnessArray = await this.getPixelBrightness(); // Step 2
    
            const averageBrightness = await this.getSmallImageBrightness(); // Step 3
    
            const mosaicWidth = Math.ceil(
                (this.originalWidth / this.pixelationFactor) * this.smallImageSize
            );
            const mosaicHeight = Math.ceil(
                (this.originalHeight / this.pixelationFactor) * this.smallImageSize
            );
    
            console.log("Mosiac Dimensions:", mosaicWidth, mosaicHeight);
    
            const mosaicCanvas = await this.generateMosaicGray(
                brightnessArray,
                averageBrightness,
                mosaicWidth,
                mosaicHeight,
            );
            mosaicPath = `${grayOutputPath}/mosaic-${fileName}`;
    
            await mosaicCanvas.toFile(mosaicPath);
            console.log("Mosaic Saved at path: ", mosaicPath);
            await greyMerge(this.bigImagePath, mosaicPath);
        } catch (er) {
            if (er) console.log("Somethings wrong: ", er);
        }
    };
    
    findClosestColorIndex(targetColor, averageArray) {
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

    async generateMosaicColor (
        pixelColor,
        averageColor,
        mosaicWidth,
        mosaicHeight
    ) {
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
                let closeIDX = this.findClosestColorIndex(pixelColor[i], averageColor);
    
                if (Math.random() < this.randomness) {
                    //used this to add random bits
                    closeIDX =
                        (closeIDX + Math.floor(Math.random() * 10)) %
                        this.smallImages.length;
                }
            
                const smallImageBuffer = this.smallImages[closeIDX].buffer;
    
                const croppedImage = await this.crop(smallImageBuffer);
    
                // Use sharp to composite images directly
                const left =
                    (i % Math.ceil(this.originalWidth / this.pixelationFactor)) *
                    this.smallImageSize;
                const top =
                    Math.floor(i / Math.ceil(this.originalWidth / this.pixelationFactor)) *
                    this.smallImageSize;
    
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

    async getMosaicColor () {
        try {
            const pixelColor = await this.getPixelColor();
    
            const averageColor = await this.getSmallAverageColor(); // Step 3
    
            const mosaicWidth = Math.ceil(
                (this.originalWidth / this.pixelationFactor) * this.smallImageSize
            );
            const mosaicHeight = Math.ceil(
                (this.originalHeight / this.pixelationFactor) * this.smallImageSize
            );
    
            console.log("Mosiac Dimensions:", mosaicWidth, mosaicHeight);
    
            const mosaicCanvas = await this.generateMosaicColor(
                pixelColor,
                averageColor,
                mosaicWidth,
                mosaicHeight,
            );
            this.mosaicPath = `${this.colorOutputPath}/mosaic-${this.fileName}`;
    
            await mosaicCanvas.toFile(this.mosaicPath);
            console.log("Mosaic Saved at path: ", this.mosaicPath);
    
            await this.colorMerge(this.bigImagePath, this.mosaicPath);
        } catch (er) {
            if (er) console.log("Something wrong: ", er);
        }
    };

    async colorMerge (input, mosaic) {
        try {
            console.log("getting mosaic file from: ", input);
            const inputMeta = await sharp(input).metadata();
            const w = inputMeta.width * this.resolutionMultiplier;
            const h = inputMeta.height * this.resolutionMultiplier;
    
            const orignalImage = await sharp(input)
                .modulate({ brightness: 0.7 })
                .resize(w, h)
                .toBuffer();
            const mosaicGrid = await sharp(mosaic)
                .resize(w, h)   
                .ensureAlpha(0.8)
                .modulate({ brightness: 0.8 })
                .toBuffer();
            const savePath = `${this.overlayPath}/overlayColor-${this.fileName}`;
    
            console.log("saving Merge file to:", savePath);
    
            await sharp(orignalImage)
                .composite([{ input: mosaicGrid, blend: "screen" }])
                // .modulate({brightness: 1.4})
                .ensureAlpha(1)
                .toFile(savePath);
    
            this.pathToreturn = savePath;
    
            console.log("-> overlay genrated");
        } catch (er) {
            console.log("Error Merging files", er);
        }
    };

    async greyMerge (input, mosaic) {
        try {
            console.log("getting mosaic file from: ", input);
    
            const inputMeta = await sharp(input).metadata();
            const w = inputMeta.width * this.resolutionMultiplier;
            const h = inputMeta.height * this.resolutionMultiplier;
    
            const orignalImage = await sharp(input)
                .resize(w, h)
                .grayscale()
                .toBuffer();
            const mosaicGrid = await sharp(mosaic)
                .resize(w, h)
                .ensureAlpha(0.7)
                .toBuffer();
    
            const savePath = `${overlayPath}/overlayGrey-${fileName}`;
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

    createOutputFolders(){
        try {      
            if (!fs.existsSync(_path.join(this.rootPath, "/output"))) {
                fs.mkdirSync(_path.join(this.rootPath, "/output"));
            }
            if (!fs.existsSync(this.colorOutputPath)) {
                fs.mkdirSync(this.colorOutputPath);
            }
            if (!fs.existsSync(this.grayOutputPath)) {
                fs.mkdirSync(this.grayOutputPath);
            }
            if (!fs.existsSync(this.overlayPath)) {
                fs.mkdirSync(this.overlayPath);
            }
        } catch (er) {
            console.log("Error creating Output Folders:", er);
        }
    };
    
    async processImage (){
        this.createOutputFolders();
    
        const startTime = new Date();
        await this.getPixelatedImage(this.bigImagePath, this.pixelationFactor); // Step 1
    
        if (this.isColor) {
            await this.getMosaicColor();
        } else {
            await this.getMosaicGray();
        }
    
        fs.rm(this.pixelatedPath, () => {});
        const endTime = new Date();
    
        console.log("Time Taken(s): ", Math.floor((endTime - startTime) / 1000));
        return { path: this.pathToreturn, mosaicPath: this.mosaicPath };
    };
    
}

module.exports = {
    Mosaic,
};
