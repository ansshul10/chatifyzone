/* eslint-disable no-undef */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaEnvelope,
  FaUser,
  FaLock,
  FaArrowRight,
  FaCheckCircle,
  FaSun,
  FaMoon,
  FaGoogle,
  FaApple,
  FaFingerprint,
  FaTimes,
} from 'react-icons/fa';
import { startRegistration } from '@simplewebauthn/browser';
import ReactMarkdown from 'react-markdown';
import { Country, State } from 'country-state-city';
import api from '../utils/api';
import Navbar from './Navbar';

// Transform country-state-city data into a usable format
const countryList = Country.getAllCountries()
  .map((c) => ({
    iso2: c.isoCode,
    name: c.name,
  }))
  .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by name

const getStatesForCountry = (iso2) => {
  console.log('[getStatesForCountry] Fetching states for iso2:', iso2);
  if (!iso2) {
    console.log('[getStatesForCountry] No iso2 provided, returning empty array');
    return [];
  }
  const states = State.getStatesOfCountry(iso2)
    .map((s) => ({
      name: s.name,
      iso2: s.isoCode,
    }))
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
  console.log('[getStatesForCountry] States found:', states);
  return states;
};

const Signup = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [age, setAge] = useState('18');
  const [gender, setGender] = useState(''); // New state for gender
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [signupMethod, setSignupMethod] = useState('password');
  const [isLoading, setIsLoading] = useState(false);
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false);
  const [states, setStates] = useState([]);
  const navigate = useNavigate();

  // Generate age options (18 to 120)
  const ageOptions = Array.from({ length: 103 }, (_, i) => (i + 18).toString());

  // Update states when country changes
  useEffect(() => {
    console.log('[Signup] Country changed:', country);
    if (!country) {
      setStates([]);
      setState('');
      console.log('[Signup] No country selected, states reset');
      return;
    }
    const newStates = getStatesForCountry(country);
    setStates(newStates);
    setState(''); // Reset state when country changes
    console.log('[Signup] States updated for country', country, ':', newStates);
  }, [country]);

  // Check WebAuthn support on component mount
  useEffect(() => {
    console.log('[Signup] Checking WebAuthn support');
    const checkWebAuthnSupport = async () => {
      try {
        if (window.PublicKeyCredential) {
          const isSupported = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          console.log('[Signup] WebAuthn support check result:', isSupported);
          setIsWebAuthnSupported(isSupported);
          if (!isSupported) {
            console.warn('[Signup] WebAuthn is not supported on this device');
          }
        } else {
          console.warn('[Signup] WebAuthn API not available in this browser');
          setIsWebAuthnSupported(false);
        }
      } catch (err) {
        console.error('[Signup] Error checking WebAuthn support:', err.message);
        setIsWebAuthnSupported(false);
      }
    };
    checkWebAuthnSupport();
  }, []);

  const handleFingerprintSignup = async () => {
    console.log('[Fingerprint Signup] Starting fingerprint signup process');
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      // Step 1: Check WebAuthn support
      if (!isWebAuthnSupported) {
        setError('Fingerprint authentication is not supported on this device or browser.');
        setIsLoading(false);
        return;
      }

      // Step 2: Validate input fields
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Please enter a valid email address');
        setIsLoading(false);
        return;
      }
      if (!username.trim() || username.length < 3 || username.length > 30) {
        setError('Please enter a valid username (3-30 characters)');
        setIsLoading(false);
        return;
      }
      if (!country) {
        setError('Please select a country');
        setIsLoading(false);
        return;
      }
      if (states.length > 0 && !state) {
        setError('Please select a state');
        setIsLoading(false);
        return;
      }
      if (!age || age < 18 || age > 120) {
        setError('You must be 18 or older to sign up');
        setIsLoading(false);
        return;
      }
      if (!gender) {
        setError('Please select a gender');
        setIsLoading(false);
        return;
      }
      if (!termsAccepted) {
        setError('You must agree to the Terms and Conditions');
        setIsLoading(false);
        return;
      }

      // Step 3: Send request to /webauthn/register/begin
      let beginResponse;
      try {
        beginResponse = await api.post('/auth/webauthn/register/begin', { email, username, country, state, age, gender });
      } catch (apiError) {
        setError(apiError.response?.data?.msg || 'Failed to start fingerprint registration. Please check your connection and try again.');
        setIsLoading(false);
        return;
      }

      // Step 4: Validate WebAuthn registration options
      const { publicKey, challenge, userID, email: responseEmail, username: responseUsername } = beginResponse.data;
      if (!publicKey || !publicKey.rp || !publicKey.user || !publicKey.challenge) {
        setError('Invalid server response: missing or malformed WebAuthn options');
        setIsLoading(false);
        return;
      }
      if (!challenge || !userID || responseEmail !== email || responseUsername !== username) {
        setError('Server returned incorrect email or username');
        setIsLoading(false);
        return;
      }

      // Step 5: Start WebAuthn registration
      let credential;
      try {
        credential = await startRegistration(publicKey);
      } catch (webauthnError) {
        if (webauthnError.name === 'NotSupportedError') {
          setError('Your device does not support fingerprint authentication.');
        } else if (webauthnError.name === 'NotAllowedError') {
          setError('Fingerprint registration was cancelled or not allowed. Please try again.');
        } else if (webauthnError.name === 'SecurityError') {
          setError('Security error: Ensure you’re using a secure connection (HTTPS) and try again.');
        } else if (webauthnError.name === 'InvalidStateError') {
          setError('A credential already exists for this device. Try logging in or using a different device.');
        } else {
          setError(`Failed to register fingerprint: ${webauthnError.message}. Please try again.`);
        }
        setIsLoading(false);
        return;
      }

      // Step 6: Send request to /webauthn/register/complete
      let completeResponse;
      try {
        completeResponse = await api.post('/auth/webauthn/register/complete', {
          email,
          username,
          country,
          state,
          age,
          gender,
          credential,
          challenge,
          userID,
        });
      } catch (completeError) {
        setError(completeError.response?.data?.msg || 'Failed to complete fingerprint registration. Please try again.');
        setIsLoading(false);
        return;
      }

      // Step 7: Store token and user data
      localStorage.setItem('token', completeResponse.data.token);
      localStorage.setItem('user', JSON.stringify(completeResponse.data.user));
      api.defaults.headers.common['x-auth-token'] = completeResponse.data.token;

      // Step 8: Update UI and redirect
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (unexpectedError) {
      setError('An unexpected error occurred during fingerprint signup. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[Password Signup] Starting password signup process');
    setError('');
    setSuccess(false);
    setIsLoading(true);

    // Validate input fields
    if (!email.trim()) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }
    if (!username.trim()) {
      setError('Please enter a valid username');
      setIsLoading(false);
      return;
    }
    if (signupMethod === 'password' && !password.trim()) {
      setError('Please enter a valid password');
      setIsLoading(false);
      return;
    }
    if (!country) {
      setError('Please select a country');
      setIsLoading(false);
      return;
    }
    if (states.length > 0 && !state) {
      setError('Please select a state');
      setIsLoading(false);
      return;
    }
    if (!age || age < 18 || age > 120) {
      setError('You must be 18 or older to sign up');
      setIsLoading(false);
      return;
    }
    if (!gender) {
      setError('Please select a gender');
      setIsLoading(false);
      return;
    }
    if (!termsAccepted) {
      setError('You must agree to the Terms and Conditions');
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await api.post('/auth/register', { email, username, password, country, state, age, gender });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      api.defaults.headers.common['x-auth-token'] = data.token;
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.msg || 'Password registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    setError('Google signup is not implemented. Please use email and password or fingerprint.');
  };

  const handleAppleSignup = () => {
    setError('Apple signup is not implemented. Please use email and password or fingerprint.');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.3 } },
  };

  const textVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  };

  const formVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  };

  const successVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  };

  // Terms and Conditions content
  const termsAndConditions = `
# Terms and Conditions

**Last Updated: April 27, 2025**

Welcome to Chatify, a global chatting platform provided by Chatify Inc. ("we," "us," or "our"). By signing up for or using our services, you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree with these Terms, please do not use our platform.

## 1. Acceptance of Terms
By creating an account or accessing Chatify, you confirm that you are at least 18 years old and agree to comply with these Terms, our Privacy Policy, and any applicable laws. These Terms apply to both registered users and anonymous users, unless otherwise specified.

## 2. Account Registration
- **Eligibility**: You must be at least 18 years old to create an account. By registering, you represent that all information provided is accurate and that you meet this age requirement.
- **Account Security**: You are responsible for maintaining the confidentiality of your account credentials (e.g., email, password, or biometric data). Notify us immediately at support@chatify.com if you suspect unauthorized access.
- **Prohibited Actions**: You may not create multiple accounts to circumvent restrictions, share your account with others, or use automated tools to register accounts.

## 3. User Conduct
You agree to use Chatify in a lawful and respectful manner. Prohibited activities include, but are not limited to:
- Posting or sharing content that is illegal, harmful, threatening, abusive, defamatory, obscene, or violates the rights of others.
- Engaging in harassment, bullying, or discrimination based on race, gender, religion, or other protected characteristics.
- Sending unsolicited messages (spam) or engaging in phishing or other malicious activities.
- Attempting to access, interfere with, or disrupt Chatify’s systems, servers, or other users’ accounts.

## 4. Content Ownership and Responsibility
- **Your Content**: You retain ownership of the content you post (e.g., messages, profile information). By posting, you grant Chatify a worldwide, non-exclusive, royalty-free license to use, store, and display your content to provide our services.
- **Responsibility**: You are solely responsible for your content. Chatify is not liable for any content posted by users, and we reserve the right to remove content that violates these Terms.

## 5. Privacy and Data Protection
Your privacy is important to us. Please review our Privacy Policy at [chatify.com/privacy](#) for details on how we collect, use, and protect your personal information. By using Chatify, you consent to our data practices as outlined in the Privacy Policy.

## 6. Safety and Moderation
- **Reporting**: If you encounter inappropriate content or behavior, please report it to support@chatify.com. We investigate all reports and may take actions such as warnings, suspensions, or account terminations.
- **Monitoring**: While we do not actively monitor private messages, we may review content to enforce these Terms or comply with legal obligations.
- **Anonymous Users**: Anonymous users are subject to the same conduct rules. Anonymous sessions expire after 24 hours, and no personal data is stored unless required by law.

## 7. Intellectual Property
All content, trademarks, and software associated with Chatify are owned by or licensed to Chatify Inc. You may not copy, modify, distribute, or reverse-engineer our platform without written permission.

## 8. Termination
We may suspend or terminate your account at our discretion, with or without notice, for reasons including but not limited to:
- Violation of these Terms.
- Suspicious or fraudulent activity.
- Legal requirements.
You may delete your account at any time via the account settings. Upon termination, your data will be handled in accordance with our Privacy Policy.

## 9. Limitation of Liability
To the fullest extent permitted by law, Chatify Inc. and its affiliates are not liable for any indirect, incidental, or consequential damages arising from your use of the platform, including but not limited to loss of data, profits, or emotional distress. Our services are provided "as is" without warranties of any kind.

## 10. Indemnification
You agree to indemnify and hold Chatify Inc., its officers, employees, and affiliates harmless from any claims, damages, or losses arising from your use of the platform or violation of these Terms.

## 11. Governing Law and Dispute Resolution
These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict of law principles. Any disputes will be resolved through binding arbitration in Delaware, except where prohibited by law. You waive any right to participate in class action lawsuits.

## 12. Changes to These Terms
We may update these Terms at any time. We will notify you of significant changes via email or in-app notifications. Continued use of Chatify after changes constitutes acceptance of the updated Terms.

## 13. Contact Us
For questions or support, contact us at:
- **Email**: support@chatify.com
- **Address**: Chatify Inc., 123 Tech Lane, Wilmington, DE 19801, USA

By checking the box during signup, you acknowledge that you have read, understood, and agree to these Terms and Conditions and our Privacy Policy.
  `;

  return (
    <>
      <Navbar />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} flex flex-col justify-between pt-20`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col lg:flex-row gap-8 lg:gap-12 flex-grow">
          <motion.div
            variants={textVariants}
            className="w-full lg:w-1/2 flex flex-col justify-center space-y-6 lg:space-y-8 px-4 sm:px-0"
          >
            <h1 className={`text-4xl sm:text-5xl font-extrabold tracking-tight text-center lg:text-left ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Join Chatify Today
            </h1>
            <p className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed text-center lg:text-left`}>
              Sign up to start your seamless communication experience. Connect with friends, enjoy private messaging, and access premium features.
            </p>
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center space-x-4 justify-center lg:justify-start">
                <FaCheckCircle className="text-red-500" />
                <span>Instant Access</span>
              </div>
              <div className="flex items-center space-x-4 justify-center lg:justify-start">
                <FaCheckCircle className="text-red-500" />
                <span>Secure Registration</span>
              </div>
              <div className="flex items-center space-x-4 justify-center lg:justify-start">
                <FaCheckCircle className="text-red-500" />
                <span>Start Chatting Instantly</span>
              </div>
            </div>
            <div className="mt-6 flex items-center space-x-4 justify-center lg:justify-start">
              <span className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Ready to Connect?</span>
              <FaArrowRight className="text-red-500 text-xl sm:text-2xl" />
            </div>
          </motion.div>
          <motion.div variants={formVariants} className="w-full lg:w-1/2 flex items-start justify-center px-4 sm:px-0">
            <div className={`bg-opacity-80 backdrop-blur-lg p-6 sm:p-8 rounded-xl shadow-2xl border ${isDarkMode ? 'bg-black border-gray-800' : 'bg-gray-200 border-gray-400'} w-full max-w-md`}>
              <h2 className={`text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Create Your Account
              </h2>
              <div className="flex justify-center space-x-4 mb-6">
                <button
                  onClick={() => setSignupMethod('password')}
                  className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'}`}
                  disabled={isLoading}
                >
                  Password
                </button>
                <button
                  onClick={() => setSignupMethod('webauthn')}
                  className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} ${!isWebAuthnSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isLoading || !isWebAuthnSupported}
                  title={!isWebAuthnSupported ? 'Fingerprint signup is not supported on this device' : ''}
                >
                  Fingerprint
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 mb-4">
                <div className="relative">
                  <div className={`flex items-center border rounded-lg p-3 ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-300 border-gray-400'}`}>
                    <FaEnvelope className={`${isDarkMode ? 'text-red-600' : 'text-red-500'} mr-3`} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your Email"
                      className={`w-full ${isDarkMode ? 'bg-[#1A1A1A] text-white placeholder-white' : 'bg-gray-300 text-white placeholder-white'} focus:outline-none ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="relative">
                  <div className={`flex items-center border rounded-lg p-3 ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-300 border-gray-400'}`}>
                    <FaUser className={`${isDarkMode ? 'text-red-600' : 'text-red-500'} mr-3`} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Your Username"
                      className={`w-full ${isDarkMode ? 'bg-[#1A1A1A] text-white placeholder-white' : 'bg-gray-300 text-white placeholder-white'} focus:outline-none ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="relative">
                  <div className={`flex items-center border rounded-lg p-3 ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-300 border-gray-400'}`}>
                    <select
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        setState('');
                        console.log('[Signup] Country selected:', e.target.value);
                      }}
                      className={`w-full ${isDarkMode ? 'bg-[#1A1A1A] text-white' : 'bg-gray-300 text-white'} focus:outline-none rounded-md ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      required
                      disabled={isLoading}
                    >
                      <option value="">Select Country</option>
                      {countryList.map((c) => (
                        <option key={c.iso2} value={c.iso2}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="relative">
                  <div className={`flex items-center border rounded-lg p-3 ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-300 border-gray-400'}`}>
                    <select
                      value={state}
                      onChange={(e) => {
                        setState(e.target.value);
                        console.log('[Signup] State selected:', e.target.value);
                      }}
                      className={`w-full ${isDarkMode ? 'bg-[#1A1A1A] text-white' : 'bg-gray-300 text-white'} focus:outline-none rounded-md ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={isLoading}
                    >
                      <option value="">Select State</option>
                      {states.length > 0 ? (
                        states.map((s) => (
                          <option key={s.iso2} value={s.name}>
                            {s.name}
                          </option>
                        ))
                      ) : (
                        <option value="">No states available</option>
                      )}
                    </select>
                  </div>
                </div>
                <div className="relative">
                  <div className={`flex items-center border rounded-lg p-3 ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-300 border-gray-400'}`}>
                    <select
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className={`w-full ${isDarkMode ? 'bg-[#1A1A1A] text-white' : 'bg-gray-300 text-white'} focus:outline-none rounded-md ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      required
                      disabled={isLoading}
                    >
                      <option value="">Select Age</option>
                      {ageOptions.map((ageValue) => (
                        <option key={ageValue} value={ageValue}>
                          {ageValue}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="relative">
                  <div className={`flex items-center border rounded-lg p-3 ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-300 border-gray-400'}`}>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className={`w-full ${isDarkMode ? 'bg-[#1A1A1A] text-white' : 'bg-gray-300 text-white'} focus:outline-none rounded-md ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      required
                      disabled={isLoading}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>
                {signupMethod === 'password' && (
                  <div className="relative">
                    <div className={`flex items-center border rounded-lg p-3 ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-300 border-gray-400'}`}>
                      <FaLock className={`${isDarkMode ? 'text-red-600' : 'text-red-500'} mr-3`} />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Your Password"
                        className={`w-full ${isDarkMode ? 'bg-[#1A1A1A] text-white placeholder-white' : 'bg-gray-300 text-white placeholder-white'} focus:outline-none ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    required
                    disabled={isLoading}
                    id="termsCheckbox"
                  />
                  <label htmlFor="termsCheckbox" className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-red-500 hover:underline"
                    >
                      Terms and Conditions
                    </button>
                  </label>
                </div>
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-red-500 text-sm text-center"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {success && (
                    <motion.div
                      variants={successVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className="text-green-500 text-sm text-center flex items-center justify-center space-x-2"
                    >
                      <FaCheckCircle />
                      <span>Signup successful! Redirecting...</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                {signupMethod === 'password' && (
                  <button
                    type="submit"
                    className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
                    disabled={isLoading || success}
                  >
                    <span>{isLoading ? 'Signing Up...' : 'Sign Up Now'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
                  disabled={isLoading}
                >
                  <FaGoogle />
                  <span>Sign Up with Google</span>
                </button>
                <button
                  type="button"
                  onClick={handleAppleSignup}
                  className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
                  disabled={isLoading}
                >
                  <FaApple />
                  <span>Sign Up with Apple</span>
                </button>
                {signupMethod === 'webauthn' && (
                  <button
                    type="button"
                    onClick={handleFingerprintSignup}
                    className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2 ${!isWebAuthnSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isLoading || !isWebAuthnSupported}
                    title={!isWebAuthnSupported ? 'Fingerprint signup is not supported on this device' : ''}
                  >
                    <FaFingerprint />
                    <span>{isLoading ? 'Processing...' : 'Sign Up with Fingerprint'}</span>
                  </button>
                )}
              </form>
              <div className={`mt-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Already have an account?{' '}
                <a href="/login" className="text-red-500 hover:underline">
                  Log in
                </a>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Terms and Conditions Modal */}
        <AnimatePresence>
          {showTermsModal && (
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <div
                className={`relative w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6 rounded-xl shadow-2xl ${
                  isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
                }`}
              >
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
                >
                  <FaTimes size={24} />
                </button>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{termsAndConditions}</ReactMarkdown>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowTermsModal(false)}
                    className={`px-4 py-2 rounded-lg font-semibold ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'}`}
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.footer
          variants={containerVariants}
          className={`py-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
        >
          © {new Date().getFullYear()} Chatify. All rights reserved.
        </motion.footer>
      </motion.div>
    </>
  );
};

export default Signup;
