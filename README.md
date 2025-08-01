# NullPath FileShare Frontend 💻✨

This repository hosts the SvelteKit web application for NullPath's End-to-End Encrypted (E2EE) and anonymous file sharing service. It is the user-facing interface responsible for all cryptographic operations, ensuring that files are encrypted in your browser before ever leaving your device.

---

### 🌟 NullPath's Core Principles (Frontend Contribution)

*   **Zero-Knowledge & Confidentiality:** All encryption and decryption processes happen client-side within your browser, ensuring that the backend server (and NullPath itself) never has access to the unencrypted content or your decryption keys.
*   **User Empowerment:** You generate and control the encryption key. It is shared only via a unique URL fragment, giving you full control over who can decrypt your files.
*   **Privacy by Design:** The application is built from the ground up with a focus on data minimization and security, avoiding unnecessary data collection or logging.
*   **No Trace Left Behind:** The app ensures that encryption keys remain client-side, and provides explicit deletion links for uploaded files.

---

### ✨ Features

*   **Drag & Drop File Upload:** Intuitive interface for selecting files.
*   **Client-Side End-to-End Encryption:** Files are encrypted in your browser using Web Crypto API (AES-GCM) before upload.
*   **Embedded Metadata:** Original filename and content type are encrypted along with the file and extracted client-side upon decryption.
*   **Shareable Download Links:** Generates unique links containing the file identifier and a client-side decryption key.
*   **Dedicated Download Page:** A user-friendly page to initiate decryption and download, with file details and progress.
*   **Ephemeral Files:** Works with a backend that automatically deletes files after a set retention period.
*   **Explicit Deletion Link:** Allows the uploader to delete the encrypted file from the server at any time.
*   **Responsive UI:** Designed to work across various devices.

---

### 💻 Technology Stack

*   **Framework:** SvelteKit
*   **Language:** TypeScript
*   **Styling:** Pure CSS (designed for a minimalist, pixelated, glowing aesthetic matching the NullPath logo)
*   **Cryptography:** Web Crypto API (browser-native for secure and performant encryption/decryption)
*   **Build Tool:** Vite

---

### 🚀 Getting Started (Development)

To run the NullPath FileShare Frontend locally:

1.  **Prerequisites:**
    *   Node.js (LTS version recommended)
    *   npm or yarn

2.  **Backend Prerequisite:**
    *   Ensure the [NullPath FileShare Backend](https://github.com/null-path/nullpath-fileshare-backend) is running (typically on `http://localhost:8080`).

3.  **Clone the Repository:**
    ```bash
    git clone https://github.com/null-path/nullpath-fileshare-frontend.git
    cd nullpath-fileshare-frontend
    ```

4.  **Install Dependencies:**
    ```bash
    npm install
    # or yarn install
    ```

5.  **Configure Environment Variables:**
    *   Create a `.env` file in the project root:
        ```
        # .env
        PUBLIC_BACKEND_URL=http://localhost:8080
        ```
    *   **IMPORTANT:** This `.env` file is excluded from Git by `.gitignore`. You will need to manually create this file locally and on any deployment environments.

6.  **Run the Development Server:**
    ```bash
    npm run dev
    # or yarn dev
    ```
    The application will typically be available at `http://localhost:5173/` (or another port if 5173 is busy).

---

### 🛠️ Building for Production

To build a production-ready version of the frontend:

```bash
npm run build
# or yarn build
```

The output will be in the `build` directory (or `dist` depending on adapter). This can then be served statically (e.g., via Nginx, Vercel, Netlify, or integrated into a Node.js server).

---

### ⚠️ Security & Deployment Considerations

*   **HTTPS is MANDATORY for Production:** Deploy your frontend with HTTPS. Without it, encrypted data and keys sent/received, even if in URL fragments, are vulnerable to interception. This also enables the secure context needed for Web Crypto API on some browsers.
*   **CORS:** Ensure your backend is correctly configured to allow CORS requests from your frontend's production domain (and `localhost` for development).
*   **Frontend Hosting:** For best performance and security, host this SvelteKit app as a static site (using the `adapter-static` for example) on a CDN or static hosting provider.
*   **`PUBLIC_BACKEND_URL`:** In production, ensure this variable points to your *production backend URL*.
*   **Browser Compatibility:** While Web Crypto API is widely supported, inform users if they encounter issues on very old browsers.

---

### 🤝 Contributing

We welcome contributions to make NullPath even more secure and user-friendly!

---

### 📄 License

This project is licensed under the MIT- see the [LICENSE](LICENSE) file for details.

---

### 🌐 Connect with NullPath

*   **GitHub Organization:** [https://github.com/null-path](https://github.com/null-path)
*   **Backend Repository:** [https://github.com/null-path/nullpath-fileshare-backend](https://github.com/NullPath/null-path-fileshare-backend)

---
