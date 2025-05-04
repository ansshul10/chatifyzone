export const loadTensorFlow = () => {
    return new Promise((resolve, reject) => {
      // Check if TensorFlow.js is already loaded
      if (window.tf) {
        console.log('[TensorFlow] Already loaded');
        resolve(window.tf);
        return;
      }
  
      // Create script element
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js';
      script.async = true;
  
      // Handle successful load
      script.onload = () => {
        if (window.tf) {
          console.log('[TensorFlow] Loaded successfully');
          resolve(window.tf);
        } else {
          console.error('[TensorFlow] Failed to initialize tf');
          reject(new Error('TensorFlow.js failed to initialize'));
        }
      };
  
      // Handle load error
      script.onerror = () => {
        console.error('[TensorFlow] Failed to load script');
        reject(new Error('Failed to load TensorFlow.js'));
      };
  
      // Append script to document
      document.head.appendChild(script);
    });
  };
