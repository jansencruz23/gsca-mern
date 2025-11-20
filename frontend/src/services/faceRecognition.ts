import * as faceapi from "face-api.js";

export const loadModels = async () => {
    const MODEL_URL = "/models";

    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        console.log("Face-api.js models loaded successfully");
        return true;
    } catch (error) {
        console.error("Error loading face-api.js models:", error);
        return false;
    }
};

export const detectFace = async (
    imageElement: HTMLImageElement | HTMLVideoElement
) => {
    try {
        const detection = await faceapi
            .detectSingleFace(
                imageElement,
                new faceapi.TinyFaceDetectorOptions()
            )
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            throw new Error("No face detected");
        }

        return {
            detection,
            descriptor: Array.from(detection.descriptor),
        };
    } catch (error) {
        console.error("Error detecting face:", error);
        throw error;
    }
};

export const compareFaces = (
    descriptor1: number[],
    descriptor2: number[],
    threshold = 0.6
) => {
    if (descriptor1.length !== descriptor2.length) {
        return 0;
    }

    let sum = 0;
    for (let i = 0; i < descriptor1.length; i++) {
        const diff = descriptor1[i] - descriptor2[i];
        sum += diff * diff;
    }

    const distance = Math.sqrt(sum);
    const similarity = 1 - Math.min(distance, threshold) / threshold;

    return similarity;
};

export const getFaceSnapshot = (videoElement: HTMLVideoElement) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("Could not get canvas context");
    }

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg");
};
