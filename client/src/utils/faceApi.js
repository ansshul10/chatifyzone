import * as faceapi from 'face-api.js';

const loadModels = async () => {
  const MODEL_URL = '/models';
  try {
    console.log('Attempting to load face-api.js models from:', MODEL_URL);
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    console.log('Face-api.js models loaded successfully');
  } catch (err) {
    console.error('Error loading face-api.js models:', err);
    throw new Error(`Failed to load face recognition models: ${err.message}`);
  }
};

const getFaceDescriptorWithLandmarks = async (videoElement) => {
  try {
    console.log('Starting face detection on video element:', videoElement);
    const detections = await faceapi
      .detectSingleFace(videoElement, new faceapi.SsdMobilenetv1Options())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detections) {
      console.log('No face detected in video feed');
      return null;
    }

    console.log('Face detected successfully:', detections);
    return {
      descriptor: Array.from(detections.descriptor),
      landmarks: detections.landmarks,
      detection: detections.detection,
    };
  } catch (err) {
    console.error('Error getting face descriptor:', err);
    throw new Error(`Face detection failed: ${err.message}`);
  }
};

export { loadModels, getFaceDescriptorWithLandmarks };
