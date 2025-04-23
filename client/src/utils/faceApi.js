import * as faceapi from 'face-api.js';

const loadModels = async () => {
  const MODEL_URL = '/models';
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    console.log('Face-api.js models loaded');
  } catch (err) {
    console.error('Error loading face-api.js models:', err);
    throw new Error('Failed to load face recognition models');
  }
};

const getFaceDescriptorWithLandmarks = async (videoElement) => {
  try {
    const detections = await faceapi
      .detectSingleFace(videoElement, new faceapi.SsdMobilenetv1Options())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detections) {
      throw new Error('No face detected');
    }

    return {
      descriptor: Array.from(detections.descriptor),
      landmarks: detections.landmarks,
      detection: detections.detection
    };
  } catch (err) {
    console.error('Error getting face descriptor:', err);
    throw err;
  }
};

export { loadModels, getFaceDescriptorWithLandmarks };
