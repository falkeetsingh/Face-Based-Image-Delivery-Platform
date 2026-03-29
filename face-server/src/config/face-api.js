const util = require('util');
if (typeof util.isNullOrUndefined === 'undefined') {
    util.isNullOrUndefined = function (obj) {
        return obj === null || obj === undefined;
    };
}
const path = require('path');
const faceapi = require('@vladmandic/face-api');
const { Canvas, Image, ImageData } = require('canvas');

let tf;
let usingNativeTfjsNode = false;
let tfjsNodeLoadError = null;

function prependPathEntries(entries) {
    const delimiter = path.delimiter;
    const currentPath = process.env.PATH || '';
    const existing = new Set(currentPath.split(delimiter).filter(Boolean));

    const next = [];
    for (const entry of entries) {
        if (!entry) {
            continue;
        }
        if (!existing.has(entry)) {
            next.push(entry);
        }
    }

    if (next.length > 0) {
        process.env.PATH = `${next.join(delimiter)}${delimiter}${currentPath}`;
    }
}

const tfjsNodeRoot = path.join(__dirname, '..', '..', 'node_modules', '@tensorflow', 'tfjs-node');
prependPathEntries([
    path.join(tfjsNodeRoot, 'lib', 'napi-v9'),
    path.join(tfjsNodeRoot, 'lib', 'napi-v8'),
    path.join(tfjsNodeRoot, 'deps', 'lib')
]);

try {
    tf = require('@tensorflow/tfjs-node');
    usingNativeTfjsNode = true;
} catch (error) {
    tfjsNodeLoadError = error;
    tf = require('@tensorflow/tfjs');
}

//face-api runs in the browser by default, so we need to provide implementations of
//the HTMLCanvasElement, HTMLImageElement, and ImageData types for it to work in Node.js for which canvas is used here.
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;

async function LoadModels() {
    if (modelsLoaded) return;

    const modelPath = path.join(__dirname, '..', '..', 'models');
    if (!usingNativeTfjsNode) {
        await tf.setBackend('cpu');
    }
    await tf.ready();
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68TinyNet.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);

    modelsLoaded = true;
    console.log(`Face-api models loaded (backend: ${tf.getBackend()}, native: ${usingNativeTfjsNode})`);
    if (!usingNativeTfjsNode) {
        const reason = tfjsNodeLoadError?.message || 'Unknown error while loading @tensorflow/tfjs-node';
        console.warn(`[face-api] Native backend unavailable. Falling back to @tensorflow/tfjs CPU. Reason: ${reason}`);
    }
}

module.exports = { LoadModels, faceapi };