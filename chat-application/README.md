# Chat Application

This project is a real-time chat application inspired by Messenger, built using Node.js, Express, Socket.io, and MongoDB (via Mongoose). It supports text messaging, voice and video chat, real-time data transfer, and features like undo, delete, or archive chat, as well as user authentication (login/logout).

## Features

- **Real-Time Messaging:**
  - Messages are sent and received instantly using Socket.io, without needing to refresh the page.
  - HTTP requests are used for initial data fetching, while Socket.io handles live updates.

- **Voice and Video Chat:**
  - Users can initiate voice and video calls for real-time communication (implementation details may vary).

- **Chat Management:**
  - Undo, delete, or archive messages and chats.
  - All actions are reflected in real-time for all participants.

- **Authentication:**
  - Secure login and logout functionality.
  - User registration and session management.

- **Date Formatting:**
  - Uses Moment.js to format and display message timestamps in a user-friendly way.

- **MongoDB Integration:**
  - Mongoose is used for schema definition and data management.
  - All messages and user data are stored in MongoDB.

## Project Structure

```
chat-application/
├── package.json
├── server.js
├── controllers/
│   ├── authController.js
│   └── messageController.js
├── middleware/
│   └── auth.js
├── models/
│   ├── Message.js
│   └── User.js
├── public/
│   ├── auth.js
│   ├── chat.js
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   └── style.css
├── routes/
│   ├── auth.js
│   └── messages.js
```

- **server.js:** Main server file, sets up Express, Socket.io, and connects to MongoDB.
- **controllers/:** Contains logic for authentication and message handling.
- **middleware/:** Middleware for authentication and other purposes.
- **models/:** Mongoose schemas for User and Message.
- **public/:** Frontend files (HTML, CSS, JS) for the chat UI and authentication pages.
- **routes/:** Express routes for authentication and messaging APIs.

## Getting Started

### Prerequisites
- Node.js (v14 or higher recommended)
- MongoDB (local or cloud instance)

### Installation
1. Clone the repository:
   ```sh
   git clone <repository-url>
   cd chat-application
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up environment variables (if required, e.g., MongoDB URI).
4. Start the server:
   ```sh
   npm start
   ```
5. Open your browser and navigate to `http://localhost:3000` (or the port specified).

## Usage
- Register a new account or log in with existing credentials.
- Start chatting in real-time with other users.
- Use voice/video chat features as available.
- Manage your chats (undo, delete, archive).
- Log out when finished.

## Technologies Used
- **Node.js & Express:** Backend server and API.
- **Socket.io:** Real-time communication.
- **MongoDB & Mongoose:** Database and ODM.
- **Moment.js:** Date formatting.
- **HTML/CSS/JavaScript:** Frontend UI.


## Acknowledgements
- [Socket.io Documentation](https://socket.io/docs/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Moment.js Documentation](https://momentjs.com/docs/)
