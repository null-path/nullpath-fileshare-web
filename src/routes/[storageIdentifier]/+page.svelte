<script lang="ts">
  import { WebCrypto } from '$lib/crypto';
  import { PUBLIC_BACKEND_URL } from '$env/static/public';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  // Component state
  let isLoading = false;
  let isFetching = false;
  let isDecrypting = false;
  let errorMessage: string | null = null;
  let successMessage: string | null = null;
  let downloadProgress = 0;

  let fetchedEncryptedBlob: Blob | null = null;
  let fetchedEncryptedFileSize: number | null = null;

  // Extracted metadata (client-side)
  let originalFileName: string | null = null;
  let originalContentType: string | null = null;

  // URL parameters and fragment
  $: storageIdentifier = $page.params.storageIdentifier;
  $: encryptionKey = $page.url.hash.substring(1);

  onMount(() => {
    if (browser && !WebCrypto.isSupported()) {
      errorMessage = "Your browser does not support the necessary Web Crypto APIs. Please use a modern browser for secure download and decryption.";
    }
  });

  async function fetchEncryptedFile() {
    if (!browser) {
      errorMessage = "File operations are only supported in a browser environment.";
      return;
    }
    if (!WebCrypto.isSupported()) {
      errorMessage = "Web Crypto API not supported.";
      return;
    }
    if (!storageIdentifier) {
      errorMessage = "File identifier missing from URL.";
      return;
    }
    if (!encryptionKey) {
      errorMessage = "Decryption key missing from URL fragment (#). Please ensure the full link was copied.";
      return;
    }

    isFetching = true;
    isLoading = true;
    errorMessage = null;
    successMessage = null;
    downloadProgress = 0;
    fetchedEncryptedBlob = null;
    fetchedEncryptedFileSize = null;
    originalFileName = null; // Clear previous
    originalContentType = null; // Clear previous

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `${PUBLIC_BACKEND_URL}/api/files/${storageIdentifier}`, true);
      xhr.responseType = 'blob';

      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          downloadProgress = (event.loaded / event.total) * 100;
        }
      };

      const fetchPromise = new Promise<Blob>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const contentLength = xhr.getResponseHeader('Content-Length');
            if (contentLength) {
                fetchedEncryptedFileSize = parseInt(contentLength, 10);
            }
            resolve(xhr.response);
          } else {
            let errorMsg = xhr.statusText;
            try {
                const errorJson = JSON.parse(xhr.responseText);
                errorMsg = errorJson.message || errorMsg;
            } catch (e) { /* not JSON */ }
            reject(new Error(errorMsg || `HTTP error! status: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error or server unreachable.'));
        xhr.send();
      });

      fetchedEncryptedBlob = await fetchPromise;
      successMessage = "File fetched. Ready to decrypt.";

    } catch (error: any) {
      console.error('Fetch error:', error);
      errorMessage = `Failed to fetch encrypted file: ${error.message || 'Unknown error'}. Please check the link.`;
    } finally {
      isFetching = false;
      isLoading = false;
    }
  }

  async function decryptAndDownload() {
    if (!fetchedEncryptedBlob) {
      errorMessage = "No file data to decrypt. Please try fetching first.";
      return;
    }
    if (!encryptionKey) {
      errorMessage = "Decryption key missing from URL. Cannot decrypt.";
      return;
    }

    isDecrypting = true;
    isLoading = true;
    errorMessage = null;
    successMessage = null;

    try {
      // 1. Decrypt the file and extract metadata
      const { decryptedBlob, metadata } = await WebCrypto.decryptFile(fetchedEncryptedBlob, encryptionKey);

      originalFileName = metadata.originalFileName;
      originalContentType = metadata.originalContentType;

      // 2. Trigger download in browser
      const url = window.URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalFileName || `decrypted_nullpath_file_${storageIdentifier}.bin`; // Use original name if available
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      successMessage = "File successfully decrypted and downloaded!";

    } catch (error: any) {
      console.error('Decryption error:', error);
      errorMessage = `Decryption failed: ${error.message || 'Unknown error'}. The key might be incorrect, or the file is corrupted.`;
    } finally {
      isDecrypting = false;
      isLoading = false;
    }
  }

  onMount(() => {
    if (browser && storageIdentifier && encryptionKey && WebCrypto.isSupported()) {
      fetchEncryptedFile();
    }
  });

</script>

<div class="app-container">
  <img src="/nullpath_logo.svg" alt="NullPath Logo" class="nullpath-logo" />
  <h1>NullPath Secure Download</h1>

  {#if errorMessage}
    <div class="message error">{errorMessage}</div>
  {:else if successMessage && !isFetching && !isDecrypting}
    <div class="message success">{successMessage}</div>
  {/if}

  {#if !storageIdentifier}
    <p class="message error">File identifier is missing from the URL. Please ensure you've copied the full shareable link.</p>
  {:else if !encryptionKey}
    <p class="message error">Decryption key missing from URL fragment (#). Please ensure the full link was copied and includes the '#key' part.</p>
  {:else if !browser || !WebCrypto.isSupported()}
    <p>Loading...</p>
  {:else}
    <h2>File Details:</h2>
    <div class="file-details">
      <p><strong>Identifier:</strong> <code>{storageIdentifier}</code></p>
      {#if fetchedEncryptedFileSize !== null}
        <p><strong>Encrypted Size:</strong> {(fetchedEncryptedFileSize / 1024 / 1024).toFixed(2)} MB</p>
      {:else if isFetching}
        <p>Fetching file size...</p>
      {/if}
      {#if originalFileName}
        <p><strong>Original Filename:</strong> {originalFileName}</p>
      {:else if fetchedEncryptedBlob}
        <p>Original filename will be known after decryption.</p>
      {/if}
      <p>This file is end-to-end encrypted. NullPath cannot read its contents.</p>
      <p class="small-text">Ensure the full link with the `#key` was copied.</p>
    </div>

    {#if isFetching}
      <p>Downloading file from server... ({Math.round(downloadProgress)}%)</p>
      <progress value={downloadProgress} max="100"></progress>
    {:else if fetchedEncryptedBlob}
      <button on:click={decryptAndDownload} disabled={isDecrypting}>
        {#if isDecrypting}
          Decrypting & Preparing Download...
        {:else}
          Decrypt & Download File
        {/if}
      </button>
    {:else if !isLoading}
      <button on:click={fetchEncryptedFile} disabled={isFetching}>
        Retry Fetch File
      </button>
    {/if}
  {/if}

  {#if !isLoading && errorMessage}
    <a href="/">Upload a new file</a>
  {/if}
</div>

<style>
  .file-details {
    background-color: #222;
    border: 1px solid #444;
    padding: 15px;
    margin: 25px 0;
    text-align: left;
    font-size: 0.9em;
  }
  .file-details p {
    margin: 8px 0;
  }
  .file-details code {
    background-color: #333;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 0.9em;
  }
  .small-text {
    font-size: 0.8em;
    color: #aaa;
  }
  progress {
    width: 100%;
    height: 15px;
    appearance: none;
    -webkit-appearance: none;
    background-color: #333;
    border: none;
    border-radius: 5px;
    overflow: hidden;
  }

  progress::-webkit-progress-bar {
    background-color: #333;
    border-radius: 5px;
  }

  progress::-webkit-progress-value {
    background-color: var(--accent-glow);
    border-radius: 5px;
    transition: width 0.3s ease-in-out;
  }

  progress::-moz-progress-bar {
    background-color: var(--accent-glow);
    border-radius: 5px;
  }
</style>