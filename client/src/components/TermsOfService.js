import React from 'react';
import { motion } from 'framer-motion';

const TermsOfService = ({ isDarkMode }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.3 } },
  };
  const textVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  };

  return React.createElement(
    motion.div,
    {
      initial: 'hidden',
      animate: 'visible',
      variants: containerVariants,
      className: `container mx-auto px-4 sm:px-6 lg:px-8 py-12 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`,
      style: { backgroundColor: '#1A1A1A' },
    },
    React.createElement(
      motion.h1,
      {
        variants: textVariants,
        className: `text-3xl sm:text-4xl font-extrabold mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`,
      },
      'Terms of Service - ChatifyZone'
    ),
    React.createElement(motion.p, { variants: textVariants, className: 'mb-4' }, 'Last Updated: May 2, 2025'),
    React.createElement(
      'section',
      { className: 'space-y-6' },
      React.createElement(
        motion.div,
        { variants: textVariants },
        React.createElement(
          'h2',
          { className: `text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}` },
          '1. Acceptance of Terms'
        ),
        React.createElement(
          'p',
          null,
          'By accessing or using ChatifyZone (the "Service"), operated by ChatifyZone Technologies Private Limited, a company incorporated under the Companies Act, 2013, you agree to be bound by these Terms of Service ("Terms") in accordance with the Indian Contract Act, 1872. If you do not agree, you must not use the Service. We may update these Terms periodically, and your continued use constitutes acceptance of the updated Terms.'
        )
      ),
      React.createElement(
        motion.div,
        { variants: textVariants },
        React.createElement(
          'h2',
          { className: `text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}` },
          '2. Eligibility'
        ),
        React.createElement(
          'p',
          null,
          'You must be at least 18 years old or have parental consent to use the Service. By using the Service, you represent that you meet these eligibility criteria and comply with the Information Technology Act, 2000.'
        )
      ),
      React.createElement(
        motion.div,
        { variants: textVariants },
        React.createElement(
          'h2',
          { className: `text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}` },
          '3. User Conduct'
        ),
        React.createElement(
          'p',
          null,
          'You agree to use the Service in compliance with applicable laws, including the Information Technology Act, 2000, and not to engage in activities such as:',
          React.createElement(
            'ul',
            { className: 'list-disc pl-6' },
            React.createElement('li', null, 'Posting or sharing unlawful, defamatory, or obscene content.'),
            React.createElement('li', null, 'Engaging in cyberbullying, harassment, or hate speech.'),
            React.createElement('li', null, 'Attempting to hack or disrupt the Service.'),
            React.createElement('li', null, 'Violating intellectual property rights.')
          ),
          'Violation may result in account suspension or termination and reporting to authorities under Indian law.'
        )
      ),
      React.createElement(
        motion.div,
        { variants: textVariants },
        React.createElement(
          'h2',
          { className: `text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}` },
          '4. Intellectual Property'
        ),
        React.createElement(
          'p',
          null,
          'All content, trademarks, and logos on ChatifyZone are owned by or licensed to ChatifyZone Technologies Private Limited. You may not reproduce, distribute, or create derivative works without prior written consent, in accordance with the Copyright Act, 1957, and Trademarks Act, 1999.'
        )
      ),
      React.createElement(
        motion.div,
        { variants: textVariants },
        React.createElement(
          'h2',
          { className: `text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}` },
          '5. User Accounts'
        ),
        React.createElement(
          'p',
          null,
          'You are responsible for maintaining the confidentiality of your account credentials. Notify us immediately of any unauthorized access. ChatifyZone may suspend or terminate accounts for violations of these Terms or applicable laws.'
        )
      ),
      React.createElement(
        motion.div,
        { variants: textVariants },
        React.createElement(
          'h2',
          { className: `text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}` },
          '6. Grievance Redressal'
        ),
        React.createElement(
          'p',
          null,
          'In compliance with the Consumer Protection Act, 2019, and IT Act, 2000, you may address grievances to our Grievance Officer:',
          React.createElement(
            'ul',
            { className: 'list-disc pl-6' },
            React.createElement('li', null, 'Name: Ms. Priya Sharma'),
            React.createElement('li', null, 'Email: grievance@chatifyzone.in'),
            React.createElement('li', null, 'Address: ChatifyZone Technologies Pvt. Ltd., 123 Tech Park, Bengaluru, Karnataka 560001, India')
          ),
          'We aim to resolve complaints within 30 days.'
        )
      ),
      React.createElement(
        motion.div,
        { variants: textVariants },
        React.createElement(
          'h2',
          { className: `text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}` },
          '7. Termination'
        ),
        React.createElement(
          'p',
          null,
          'We may terminate or suspend your access to the Service without notice for violations of these Terms, unlawful conduct, or at our discretion, in accordance with applicable Indian laws.'
        )
      ),
      React.createElement(
        motion.div,
        { variants: textVariants },
        React.createElement(
          'h2',
          { className: `text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}` },
          '8. Limitation of Liability'
        ),
        React.createElement(
          'p',
          null,
          'To the extent permitted by Indian law, ChatifyZone shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service. The Service is provided "as is" without warranties.'
        )
      ),
      React.createElement(
        motion.div,
        { variants: textVariants },
        React.createElement(
          'h2',
          { className: `text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}` },
          '9. Governing Law and Jurisdiction'
        ),
        React.createElement(
          'p',
          null,
          'These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Bengaluru, Karnataka, India.'
        )
      ),
      React.createElement(
        motion.div,
        { variants: textVariants },
        React.createElement(
          'h2',
          { className: `text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}` },
          '10. Contact Us'
        ),
        React.createElement(
          'p',
          null,
          'For questions about these Terms, contact us at ',
          React.createElement(
            'a',
            { href: 'mailto:support@chatifyzone.in', className: 'text-red-500 hover:underline' },
            'support@chatifyzone.in'
          ),
          ' or write to: ChatifyZone Technologies Pvt. Ltd., 123 Tech Park, Bengaluru, Karnataka 560001, India.'
        )
      )
    )
  );
};

export default TermsOfService;