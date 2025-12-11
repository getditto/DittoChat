# Ditto Chat Demo App

Welcome to the Ditto Chat Demo App! This application showcases the capabilities of Ditto, a powerful real-time database that enables seamless data synchronization across devices, even offline. This demo provides a simple chat interface to demonstrate how Ditto can be used to build collaborative, offline-first applications.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher)
- npm (v9 or higher) or yarn (v1.22 or higher)
- A Ditto Portal account and a provisioned Ditto application. You will need your App ID and a valid token.

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd DittoChatDemo
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

### Running the App

1.  **Configure Ditto:**
    Before running the app, you need to set up your Ditto credentials. Create a `.env` file in the root of the `DittoChatDemo` directory with your Ditto App ID and token:

    ```
    VITE_DITTO_APP_ID="YOUR_DITTO_APP_ID"
    VITE_DITTO_APP_TOKEN="YOUR_DITTO_APP_TOKEN"
    VITE_DITTO_AUTH_URL="YOUR_DITTO_AUTH_URL"
    VITE_DITTO_WEB_SOCKET="YOUR_DITTO_WEB_SOCKET"
    ```

    Replace the placeholder values with your actual Ditto application credentials from the Ditto Portal.

2.  **Start the development server:**

    ```bash
    npm run dev
    # or
    yarn dev
    ```

    The application will typically be available at `http://localhost:5173` (or another port if 5173 is in use). Open this URL in your browser to start chatting.

## How it Works

This demo application uses Ditto to manage and synchronize chat messages.

- When the application starts, it initializes a Ditto instance.
- Messages are stored as documents in a Ditto Collection.
- Ditto's real-time capabilities ensure that any changes (new messages) in the collection are instantly pushed to all connected devices.
- The app subscribes to the messages collection, displaying new messages as they arrive.
- Ditto handles the complexities of conflict resolution and offline data storage, making it robust and reliable.
