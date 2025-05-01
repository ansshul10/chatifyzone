ChatifyZone

ChatifyZone is a cutting-edge, real-time chat application built with React and Node.js, designed for seamless and secure communication. Whether you're connecting with friends, engaging in anonymous conversations, or customizing your profile, ChatifyZone offers a modern, responsive, and feature-rich platform for real-time messaging. Powered by Socket.IO for instant message delivery and styled with Tailwind CSS for a sleek UI, this app is perfect for developers and users looking for a robust chat solution.

🚀 Features

Secure Authentication: Sign up, log in, recover forgotten passwords, and reset passwords with JWT and Bcrypt.
Real-Time Messaging: Send and receive messages instantly with Socket.IO, including sent/delivered/read status updates.
Anonymous Chatting: Join as a guest without registering, using temporary sessions for privacy.
Customizable Profiles: Update your bio, country, and privacy settings (public, friends-only, private).
Message Actions: Edit, delete, or react to messages for interactive communication.
User Search & Filter: Find users by username or filter by gender in the user list.
Responsive Design: Mobile-friendly interface styled with Tailwind CSS, ensuring accessibility across devices.
MongoDB Backend: Robust data storage for users, messages, and sessions with Mongoose.

🌐 Live Demo

Try ChatifyZone live at https://chatifyzone.vercel.app/

🛠️ Installation

Get ChatifyZone up and running on your local machine with these simple steps.

Prerequisites

Node.js (v14.0.0+): Download Node.js
npm (v6.0.0+, included with Node.js)
MongoDB: Local instance or cloud service like MongoDB Atlas (MongoDB Installation)

Git: Install Git

Setup Steps

Clone the Repository:
cd chatifyzone

Install Dependencies:

Client:
cd client
npm install

Server:
cd server
npm install

Configure Environment Variables:

In server/.env:

PORT=
MONGO_URI=
JWT_SECRET=
EMAIL_USER=
EMAIL_PASS=
CLIENT_URL=
WEBAUTHN_RP_ID=
SESSION_SECRET=

In client/.env:

REACT_APP_API_URL="YOUR URL"/api
REACT_APP_SOCKET_URL="YOUR URL"

Note: Replace placeholders (e.g., your_mongo_connection_string) with actual values. Ensure .env files are listed in .gitignore to avoid exposing sensitive data.

Run the Application:

Start the backend:
cd server
node server.js

Start the frontend:
cd client
npm start

Access ChatifyZone: Open  in your browser to start chatting!

🎮 Usage

Once running, ChatifyZone is intuitive to use:

Sign Up/Login: Create an account or log in with existing credentials.
Anonymous Mode: Use the AnonymousEntry feature to chat without registering.
Chat with Users: Select a user from the UserList to start a real-time conversation.
Manage Messages: Edit, delete, or react to messages in the ChatWindow.
Customize Profile: Update your bio, country, or privacy settings via the Profile page.
Responsive UI: Access ChatifyZone on desktop or mobile devices seamlessly.

🛠️ Technologies Used

Frontend

React: Dynamic UI components (React)
Tailwind CSS: Utility-first styling (Tailwind CSS)
Socket.IO Client: Real-time communication (Socket.IO)
Axios: API requests (Axios)
React Router: Client-side routing (React Router)

Backend

Node.js: Server-side runtime (Node.js)
Express: API framework (Express)
MongoDB with Mongoose: NoSQL database and ODM (MongoDB, Mongoose)
Socket.IO: Real-time messaging (Socket.IO)
JWT: Secure authentication (JWT)
Bcrypt: Password hashing (Bcrypt)

🔧 Troubleshooting

MongoDB Connection: Ensure MONGO_URI is correct and MongoDB is running. Test with MongoDB Compass.
CORS Issues: Verify CLIENT_URL in server/.env matches the frontend URL (e.g., [invalid url, do not cite]).
Dependency Errors: Delete node_modules and package-lock.json, then run npm install again.
Port Conflicts: If port 3000 or 5000 is in use, change the port in client/package.json or server.js.

🚀 Make ChatifyZone Viral

Help ChatifyZone reach more developers:

Star the Repo: Click the ⭐ button on GitHub to show your support!
Share: Post about ChatifyZone on Twitter, LinkedIn, or developer forums.
Fork & Experiment: Clone the repo and add your own features.
Feedback: Share ideas or report issues via GitHub Issues.

📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

Copyright (c) 2025 [Anshul Gurjar]

All rights reserved. ChatifyZone is the intellectual property of [Your Name]. Unauthorized commercial use or distribution without permission is prohibited.

📬 Contact

Email: ansshul10@gmail.com
GitHub: ansshul10
