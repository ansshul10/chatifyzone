import React from 'react';
import { motion } from 'framer-motion';

const PrivacyPolicy = ({ isDarkMode }) => {
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
      'Privacy Policy - ChatifyZone'
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
          '1. Introduction'
        ),
        React.createElement(
          'p',
          null,
          'ChatifyZone Technologies Private Limited ("we," "us," or "our"), incorporated under the Companies Act, 2013, is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, disclose, and safeguard your personal data in compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act), Information Technology Act, 2000, and IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.'
        )
      ),
      React.createElement(
        motion.div,
        { variants: textVariants },
        React.createElement(
          'h2',
          { className: `text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}` },
          '2. Data We Collect'
        ),
        React.createElement('p', null, 'We may collect the following types of data with your consent:'),
        React.createElement(
          'ul',
          { className: 'list-disc pl-6' },
          React.createElement(
            'li',
            null,
            React.createElement('strong', null, 'Personal Data:'),
            ' Name, email address, phone number (optional), and other details provided during account creation or newsletter subscription.'
          ),
          React.createElement(
            'li',
            null,
            React.createElement('strong', null, 'Sensitive Personal Data:'),
            ' Passwords (encrypted), as defined under IT Rules, 2011.'
          ),
          React.createElement(
            'li',
            null,
            React.createElement('strong', null, 'Usage Data:'),
            ' IP address, browser type, device information, and interaction data.'
          ),
          React.createElement(
            'li',
            null,
            React.createElement('strong', null, 'Anonymous Data:'),
            ' Non-identifiable data from anonymous users to improve the Service.'
          )
        )
      ),
      React.createElement(
        motion.div,
        { variants: textVariants },
        React.createElement(
          'h2',
          { className: `text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}` },
          '3. Purpose of Data Collection'
        ),
        React.createElement('p', null, 'We use your data for the following purposes:'),
        React.createElement(
          'ul',
          { className: 'list-disc pl-6' },
          React.createElement('li', null, 'To provide and personalize the Service.'),
          React.createElement('li', null, 'To send newsletters or promotional materials with your consent.'),
          React.createElement('li', null, 'To analyze usage and improve the Service.'),
          React.createElement('li', null, 'To comply with legal obligations under Indian law.')
        )
      ),
      React.createElement(
        motion.div,
        { variants: textVariants },
        React.createElement(
          'h2',
          { className: `text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}` },
          '4. Data Sharing'
        ),
        React.createElement(
          'p',
          null,
          'We do not sell or rent your personal data. We may share data with:',
          React.createElement(
            'ul',
            { className: 'list-disc pl-6' },
            React.createElement('li', null, 'Third-party service providers (e.g., analytics, email services) under strict confidentiality agreements.'),
            React.createElement('li', null, 'Government authorities, if required by Indian law.')
          )
        )
      ),
      React.createElement(
        motion.div,
        { variants: textVariants },
        React.createElement(
          'h2',
          { className: `text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}` },
          '5. Data Security'
        ),
        React.createElement(
          'p',
          null,
          'We implement reasonable security practices as per IT Rules, 2011, including end-to-end encryption and ISO/IEC 27001-compliant measures. However, no online service is 100% secure, and we cannot guarantee absolute security.'
        )
      ),
      React.createElement(
        motion.div,
        { variants: textVariants },
        React.createElement(
          'h2',
          { className: `text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}` },
          '6. Your Rights'
        ),
        React.createElement(
          'p',
          null,
          'Under the DPDP Act, 2023, you have the right to:',
          React.createElement(
            'ul',
            { className: 'list-disc pl-6' },
            React.createElement('li', null, 'Access and correct your personal data.'),
            React.createElement('li', null, 'Request deletion of your data, subject to legal obligations.'),
            React.createElement('li', null, 'Withdraw consent for data processing.'),
            React.createElement('li', null, 'Nominate a representative for your data in case of incapacity.')
          ),
          'To exercise these rights, contact our Data Protection Officer at ',
          React.createElement(
            'a',
            { href: 'mailto:dpo@chatifyzone.in', className: 'text-red-500 hover:underline' },
            'dpo@chatifyzone.in'
          ),
          '.'
        )
      ),
      React.createElement(
        motion.div,
        { variants: textVariants },
        React.createElement(
          'h2',
          { className: `text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}` },
          '7. Cookies'
        ),
        React.createElement(
          'p',
          null,
          'We use cookies to enhance functionality. You may disable cookies via browser settings, but this may impact the Service. We obtain your consent for non-essential cookies as per IT Rules, 2011.'
        )
      ),
      React.createElement(
        motion.div,
        { variants: textVariants },
        React.createElement(
          'h2',
          { className: `text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}` },
          '8. Grievance Redressal'
        ),
        React.createElement(
          'p',
          null,
          'For privacy-related complaints, contact our Grievance Officer:',
          React.createElement(
            'ul',
            { className: 'list-disc pl-6' },
            React.createElement('li', null, 'Name: Ms. Priya Sharma'),
            React.createElement('li', null, 'Email: grievance@chatifyzone.in'),
            React.createElement('li', null, 'Address: ChatifyZone Technologies Pvt. Ltd., 123 Tech Park, Bengaluru, Karnataka 560001, India')
          ),
          'We will respond within 30 days as per the DPDP Act, 2023.'
        )
      ),
      React.createElement(
        motion.div,
        { variants: textVariants },
        React.createElement(
          'h2',
          { className: `text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}` },
          '9. Changes to This Policy'
        ),
        React.createElement(
          'p',
          null,
          'We may update this Privacy Policy to reflect changes in law or our practices. We will notify you of significant changes via email or on our website, as required by the DPDP Act, 2023.'
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
          'For questions about this Privacy Policy, contact us at ',
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

export default PrivacyPolicy;