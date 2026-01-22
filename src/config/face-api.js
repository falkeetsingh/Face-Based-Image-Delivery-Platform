const path = require('path');
const faceapi = require('face-api.js');
const tf = require('@tensorflow/tfjs');
const { Canvas, Image, ImageData } = require('canvas');

//face-api runs in the browser by default, so we need to provide implementations of
//the HTMLCanvasElement, HTMLImageElement, and ImageData types for it to work in Node.js for which canvas is used here.
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;

async function LoadModels() {
    if (modelsLoaded) return;

    const modelPath = path.join(__dirname, '..', '..', 'models');
    // Ensure CPU backend is ready in pure tfjs environment
    await tf.setBackend('cpu');
    await tf.ready();
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);

    modelsLoaded = true;
    console.log('Face-api models loaded');
}

module.exports = { LoadModels, faceapi };