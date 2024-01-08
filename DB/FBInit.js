// Import the functions you need from the SDKs you need
const { initializeApp } = require("firebase/app");
const { getDownloadURL, getStorage, ref, uploadBytes } = require("firebase/storage");

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBb99zRBj7i7_iWyNuCeYgxGlPJDg8-zs0",
    authDomain: "mosaic-61a36.firebaseapp.com",
    projectId: "mosaic-61a36",
    storageBucket: "mosaic-61a36.appspot.com",
    messagingSenderId: "894039785455",
    appId: "1:894039785455:web:dc20643c7a390c516dc01a",
};

var app, storage;

// Initialize Firebase
const initFireBase = () => {
    app = initializeApp(firebaseConfig);
    storage = getStorage(app);
    console.log("-> FireBase Initialised");
};

const uploadMosaic = async (imageBuffer, fileName) => {
    const creationRef = ref(storage, `creations/${fileName}`);
    await uploadBytes(creationRef, imageBuffer, { contentType: "image/jpeg" });
};

const getURL = async (fileName) => {
    const creationRef = ref(storage, `creations/${fileName}`);
    const url = await getDownloadURL(creationRef);
    return url;
};

module.exports = {
    initFireBase,
    uploadMosaic,
    getURL
}
