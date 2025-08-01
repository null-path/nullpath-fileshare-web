<script lang="ts">
  import { WebCrypto } from '$lib/crypto';
  import { PUBLIC_BACKEND_URL } from '$env/static/public';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let selectedFile: File | null = null;
  let uploadProgress = 0;
  let isLoading = false;
  let errorMessage: string | null = null;
  let successMessage: string | null = null;

  let downloadUrl: string | null = null;
  let deletionUrl: string | null = null;

  let isDragOver = false;

  let fileInput: HTMLInputElement;

  onMount(() => {
    if (browser) {
      if (!WebCrypto.isSupported()) {
        errorMessage = "Your browser does not support the necessary Web Crypto APIs for secure file encryption. Please use a modern browser.";
      }
    }
  });

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      selectedFile = target.files[0];
      errorMessage = null;
      successMessage = null;
      resetLinks();
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      selectedFile = event.dataTransfer.files[0];
      errorMessage = null;
      successMessage = null;
      resetLinks();
      if (fileInput) fileInput.files = event.dataTransfer.files;
    }
  }

  function resetLinks() {
    downloadUrl = null;
    deletionUrl = null;
  }

  async function uploadFile() {
    if (!browser) {
        errorMessage = "Encryption and upload can only be performed in a browser environment.";
        return;
    }
    if (!selectedFile) {
      errorMessage = "Please select a file to upload.";
      return;
    }
    if (!WebCrypto.isSupported()) {
      errorMessage = "Web Crypto API not supported in this browser.";
      return;
    }

    isLoading = true;
    errorMessage = null;
    successMessage = null;
    uploadProgress = 0;
    resetLinks();

    try {
      const encryptionResult = await WebCrypto.encryptFile(selectedFile, (progress) => {
        uploadProgress = progress / 2;
      });

      const encryptedBlob = encryptionResult.encryptedBlob;
      const encryptionKey = encryptionResult.key;

      const formData = new FormData();
      formData.append('file', encryptedBlob, 'encrypted_blob');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${PUBLIC_BACKEND_URL}/api/files`, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          uploadProgress = 50 + (event.loaded / event.total) * 50;
        }
      };

      const responsePromise = new Promise<Response>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const headersString = xhr.getAllResponseHeaders();
            const headers = new Headers();
            headersString.split('\r\n').forEach(line => {
              const parts = line.split(': ');
              if (parts.length === 2) {
                headers.append(parts[0], parts[1]);
              }
            });
            resolve(new Response(xhr.responseText, { status: xhr.status, headers }));
          } else {
            reject(new Error(xhr.statusText || 'Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error or server unreachable'));
        xhr.send(formData);
      });

      const response = await responsePromise;

      if (!response.ok) {
        let errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          errorText = errorJson.message || errorText;
        } catch (e) {  }
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();

      downloadUrl = `${window.location.origin}/${responseData.storageIdentifier}#${encryptionKey}`;
      deletionUrl = responseData.deletionUrl;

      successMessage = `File uploaded and encrypted! Share the link.`;
      selectedFile = null;
      uploadProgress = 100;

    } catch (error: any) {
      console.error('Upload error:', error);
      errorMessage = `Upload failed: ${error.message || 'Unknown error'}. Please try again.`;
      uploadProgress = 0;
      resetLinks();
    } finally {
      isLoading = false;
    }
  }

  function copyToClipboard(text: string) {
    if (browser) {
        navigator.clipboard.writeText(text).then(() => {
        alert('Link copied to clipboard!');
        }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy link to clipboard. Please copy manually.');
        });
    } else {
        alert('Copy to clipboard is only available in the browser.');
    }
  }
</script>

<div class="app-container">
  <h1>NullPath Secure Share</h1>
  <p>End-to-end encrypted file sharing. Your data, your key, no trace.</p>

  {#if errorMessage}
    <div class="message error">{errorMessage}</div>
  {/if}
  {#if successMessage}
    <div class="message success">{successMessage}</div>
  {/if}

  {#if !downloadUrl && !deletionUrl}
    <label for="file-upload" class="drop-area"
      class:drag-over={isDragOver}
      on:dragover|preventDefault={handleDragOver}
      on:dragleave|preventDefault={handleDragLeave}
      on:drop|preventDefault={handleDrop}
    >
      <p>Drag & Drop your file here</p>
      <span>or click to select</span>
      <input type="file" id="file-upload" bind:this={fileInput} on:change={handleFileSelect} style="display: none;" />
    </label>

    {#if selectedFile}
      <p>Selected: **{selectedFile.name}** ({ (selectedFile.size / 1024 / 1024).toFixed(2) } MB)</p>
      <button on:click={uploadFile} disabled={isLoading || !selectedFile}>
        {#if isLoading}
          Uploading ({Math.round(uploadProgress)}%)
        {:else}
          Encrypt & Upload
        {/if}
      </button>
    {:else if browser && !WebCrypto.isSupported()}
      <p>Waiting for file...</p>
    {/if}
  {/if}

  {#if downloadUrl}
    <div class="link-display">
      <label for="download-link-input">Share This Link (Includes Decryption Key!)</label>
      <input id="download-link-input" type="text" value={downloadUrl || ''} readonly />
      <button on:click={() => copyToClipboard(downloadUrl || '')}>Copy Download Link</button>
    </div>

    <div class="link-display">
      <label for="deletion-link-input">File Deletion Link (Keep This Private!)</label>
      <input id="deletion-link-input" type="text" value={deletionUrl || ''} readonly />
      <button on:click={() => copyToClipboard(deletionUrl || '')}>Copy Deletion Link</button>
      <button on:click={async () => {
        if (!confirm('Are you sure you want to delete this file immediately?')) return;
        isLoading = true;
        try {
          const res = await fetch(deletionUrl || '', { method: 'DELETE' });
          if (res.ok) {
            alert('File successfully deleted!');
            downloadUrl = null;
            deletionUrl = null;
            successMessage = null;
          } else {
            const errorText = await res.text();
            alert(`Failed to delete: ${errorText}`);
          }
        } catch (e: any) {
          alert(`Error deleting: ${e.message}`);
        } finally {
          isLoading = false;
        }
      }} disabled={isLoading}>
        Delete File Now
      </button>
    </div>

    <button on:click={() => { resetLinks(); selectedFile = null; successMessage = null; if(fileInput) fileInput.value = ''; }} disabled={isLoading}>
      Upload Another File
    </button>
  {/if}
</div>