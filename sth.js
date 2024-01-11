const sharp = require("sharp");

console.log("Hello");
sharp({
    limits: {
        pixels: 9000000, // adjust this value to your needs
        filesize: 9000000,
    },
});


const fun = async () => {
    try{
    const img1 = await sharp("./assets/big/big.jpg")
        .resize(1080, 1080)
        .toColourspace("rgba")
        .ensureAlpha(1)
        .toBuffer();

    const img2 = await sharp("./assets/big/col.jpg")
        .resize(1080, 1080)
        .toColorspace('rgba')
        .ensureAlpha(0.6)
        .modulate({brightness: 0.6})
        .toBuffer();

    await sharp(img2)
        .composite([
            { input: img1, blend: "over" },
            { input: img2, blend: "screen" },
        ])
        .toFile("./assets/hii.jpg");
    } catch (er) {
        console.log(er);
    }
};

fun();
