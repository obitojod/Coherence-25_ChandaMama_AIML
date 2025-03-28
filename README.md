# Pyaaz Chat

A modern AI chatbot application with conversation history, authentication, and user profiles, powered by the Gemini API.

## Features

- **User Authentication**: Secure login and registration with email verification
- **Responsive UI**: Clean, minimal white theme with purple accents that works on both mobile and web
- **Chat Interface**: Modern interface for conversing with the AI assistant
- **Conversation History**: Save and browse past conversations
- **Profile Management**: Update user information
- **Password Reset**: Secure password recovery flow

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Express.js and Node.js
- **Database**: MongoDB Atlas (pyaaz collection)
- **AI**: Google's Gemini API

## Setup Instructions

### Prerequisites

- Node.js and npm installed
- MongoDB Atlas account
- Google Gemini API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   GEMINI_KEY=your_gemini_api_key
   ```
4. Update the MongoDB connection string in `backend/server.js` if needed
5. Start the backend server:
   ```
   node backend/server.js
   ```
6. Start the Expo development server:
   ```
   npx expo start
   ```

## Usage

1. Register a new account or login with existing credentials
2. Navigate to the Chat screen to start a conversation with the AI
3. View your conversation history in the Conversations screen
4. Update your profile information in the Profile screen

## License

This project is licensed under the MIT License - see the LICENSE file for details. 