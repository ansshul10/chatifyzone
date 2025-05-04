import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { FaPhone, FaPhoneSlash, FaRedo } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const VoiceCall = ({ userId, receiverId, socket, onEndCall, isDarkMode, startCall }) => {
  const [stream, setStream] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [error, setError] = useState('');
  const peerRef = useRef(null);
  const audioRef = useRef();

  // Initialize media stream
  const initializeStream = () => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        setStream(s);
        if (audioRef.current) {
          audioRef.current.srcObject = s;
        }
        setError('');
      })
      .catch((err) => {
        console.error('[VoiceCall] Media access error:', err);
        setError('Failed to access microphone. Please allow microphone permissions.');
      });
  };

  useEffect(() => {
    initializeStream();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Initiate a call
  const initiateCall = () => {
    if (!stream) {
      setError('Microphone not ready. Please try again.');
      return;
    }
    peerRef.current = new Peer({
      initiator: true,
      trickle: false,
      stream,
      config: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      },
    });

    peerRef.current.on('signal', (data) => {
      console.log('[VoiceCall] Sending offer:', data);
      socket.emit('call', { callerId: userId, receiverId, offer: data });
    });

    peerRef.current.on('stream', (remoteStream) => {
      console.log('[VoiceCall] Received remote stream');
      if (audioRef.current) {
        audioRef.current.srcObject = remoteStream;
      }
      setCallActive(true);
      setError('');
    });

    peerRef.current.on('error', (err) => {
      console.error('[VoiceCall] Peer error:', err);
      setError('Call failed due to a connection issue.');
      endCall();
    });

    socket.emit('call', { callerId: userId, receiverId, offer: null });
  };

  // Auto-initiate call if startCall is true
  useEffect(() => {
    if (startCall && stream && !callActive && !incomingCall) {
      console.log('[VoiceCall] Auto-initiating call');
      initiateCall();
    }
  }, [startCall, stream]);

  // Answer an incoming call
  const answerCall = () => {
    if (!stream || !incomingCall) {
      setError('Unable to answer call. Please try again.');
      return;
    }
    peerRef.current = new Peer({
      initiator: false,
      trickle: false,
      stream,
      config: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      },
    });

    peerRef.current.on('signal', (data) => {
      console.log('[VoiceCall] Sending answer:', data);
      socket.emit('callAnswer', {
        callerId: incomingCall.callerId,
        receiverId: userId,
        answer: data,
      });
    });

    peerRef.current.on('stream', (remoteStream) => {
      console.log('[VoiceCall] Received remote stream');
      if (audioRef.current) {
        audioRef.current.srcObject = remoteStream;
      }
      setCallActive(true);
      setError('');
    });

    peerRef.current.on('error', (err) => {
      console.error('[VoiceCall] Peer error:', err);
      setError('Call failed due to a connection issue.');
      endCall();
    });

    peerRef.current.signal(incomingCall.offer);
    setIncomingCall(null);
  };

  // End the call
  const endCall = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    socket.emit('endCall', { targetId: receiverId });
    setCallActive(false);
    setStream(null);
    setIncomingCall(null);
    setError('');
    onEndCall();
  };

  // Socket.IO event listeners
  useEffect(() => {
    socket.on('incomingCall', ({ callerId, offer }) => {
      console.log('[VoiceCall] Received incoming call from:', callerId);
      setIncomingCall({ callerId, offer });
    });

    socket.on('callAnswered', ({ receiverId, answer }) => {
      console.log('[VoiceCall] Call answered by:', receiverId);
      if (peerRef.current) {
        peerRef.current.signal(answer);
      }
    });

    socket.on('iceCandidate', ({ candidate }) => {
      console.log('[VoiceCall] Received ICE candidate');
      if (peerRef.current) {
        peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
          console.error('[VoiceCall] ICE candidate error:', err);
        });
      }
    });

    socket.on('callEnded', () => {
      console.log('[VoiceCall] Call ended by remote user');
      endCall();
    });

    socket.on('callError', ({ msg }) => {
      console.error('[VoiceCall] Call error:', msg);
      setError(`Call error: ${msg}`);
      endCall();
    });

    return () => {
      socket.off('incomingCall');
      socket.off('callAnswered');
      socket.off('iceCandidate');
      socket.off('callEnded');
      socket.off('callError');
    };
  }, [socket]);

  const buttonVariants = {
    hover: { scale: 1.1 },
    tap: { scale: 0.95 },
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={`fixed bottom-20 left-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'
        }`}
      >
        {error && (
          <div className="mb-4 p-2 bg-red-900/20 text-red-400 text-sm rounded">
            {error}
            {error.includes('microphone') && (
              <button
                onClick={initializeStream}
                className="ml-2 text-green-400 underline"
              >
                Retry
              </button>
            )}
          </div>
        )}
        {callActive || incomingCall ? (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {callActive ? 'Voice Call Active' : 'Incoming Call'}
              </h3>
              <p className="text-sm">
                {callActive ? 'Connected' : `From ${incomingCall?.callerId}`}
              </p>
            </div>
            <div className="flex space-x-2">
              {incomingCall && !callActive && (
                <motion.button
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                  onClick={answerCall}
                  className={`p-2 rounded-full ${
                    isDarkMode ? 'bg-green-600' : 'bg-green-500'
                  } text-white`}
                >
                  <FaPhone />
                </motion.button>
              )}
              <motion.button
                whileHover="hover"
                whileTap="tap"
                variants={buttonVariants}
                onClick={endCall}
                className={`p-2 rounded-full ${
                  isDarkMode ? 'bg-red-600' : 'bg-red-500'
                } text-white`}
                title="End Call"
              >
                <FaPhoneSlash />
              </motion.button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Voice Call</h3>
              <p className="text-sm">Ready to call {receiverId}</p>
            </div>
            <motion.button
              whileHover="hover"
              whileTap="tap"
              variants={buttonVariants}
              onClick={initiateCall}
              className={`p-2 rounded-full ${
                isDarkMode ? 'bg-green-600' : 'bg-green-500'
              } text-white`}
              disabled={!stream}
            >
              <FaPhone />
            </motion.button>
          </div>
        )}
        <audio ref={audioRef} autoPlay />
      </motion.div>
    </AnimatePresence>
  );
};

export default VoiceCall;