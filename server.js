const { getMosaicGray, getMosaicColor, processImage } = require("./utils");

// Input image file path
const inputImagePath = "./assets/2.jpg";
const pixelationFactor = 20;

// getMosaicGray(inputImagePath, pixelationFactor);

processImage(inputImagePath, pixelationFactor, true);
