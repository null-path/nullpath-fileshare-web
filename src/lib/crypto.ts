import { browser } from '$app/environment';

const ALGORITHM_NAME = 'AES-GCM';
const IV_LENGTH_BYTES = 12;
const METADATA_HEADER_LENGTH_BYTES = 100;

interface FileMetadataHeader {
  originalFileName: string;
  originalContentType: string;
}

export class WebCrypto {
  static isSupported(): boolean {
    return browser && window.crypto && window.crypto.subtle !== undefined;
  }

  static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: ALGORITHM_NAME,
        length: 256,
      },
      true,
      ['encrypt', 'decrypt'],
    );
  }

  static async exportKey(key: CryptoKey): Promise<string> {
    if (!browser) throw new Error('Web Crypto API only available in browser.');
    const exported = await crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  static async importKey(keyString: string): Promise<CryptoKey> {
    if (!browser) throw new Error('Web Crypto API only available in browser.');
    const binaryKey = Uint8Array.from(atob(keyString.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
      c.charCodeAt(0),
    );
    return await crypto.subtle.importKey(
      'raw',
      binaryKey,
      {
        name: ALGORITHM_NAME,
      },
      true,
      ['encrypt', 'decrypt'],
    );
  }

  static async encryptFile(
    file: File,
    onProgress: (progress: number) => void = () => {},
  ): Promise<{ encryptedBlob: Blob; key: string }> {
    const key = await this.generateKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));

    const metadata: FileMetadataHeader = {
      originalFileName: file.name,
      originalContentType: file.type || 'application/octet-stream',
    };

    const metadataJson = JSON.stringify(metadata);
    const metadataBuffer = new TextEncoder().encode(metadataJson);
    if (metadataBuffer.byteLength > METADATA_HEADER_LENGTH_BYTES) {
        throw new Error('Metadata too large for fixed-size header.');
    }
    const metadataPadded = new Uint8Array(METADATA_HEADER_LENGTH_BYTES);
    metadataPadded.set(metadataBuffer, 0);
    const fileBuffer = await file.arrayBuffer();
    const combinedPayload = new Uint8Array(metadataPadded.byteLength + fileBuffer.byteLength);
    combinedPayload.set(metadataPadded, 0);
    combinedPayload.set(new Uint8Array(fileBuffer), metadataPadded.byteLength);


    onProgress(50);

    const encryptedContent = await crypto.subtle.encrypt(
      {
        name: ALGORITHM_NAME,
        iv: iv,
      },
      key,
      combinedPayload,
    );

    onProgress(100);

    const finalBlobData = new Uint8Array(iv.length + encryptedContent.byteLength);
    finalBlobData.set(iv, 0);
    finalBlobData.set(new Uint8Array(encryptedContent), iv.length);

    return {
      encryptedBlob: new Blob([finalBlobData], { type: 'application/octet-stream' }),
      key: await this.exportKey(key),
    };
  }

  static async decryptFile(encryptedBlobWithIvAndMetadata: Blob, keyString: string): Promise<{decryptedBlob: Blob, metadata: FileMetadataHeader}> {
    const key = await this.importKey(keyString);

    const combinedBuffer = await encryptedBlobWithIvAndMetadata.arrayBuffer();
    const iv = new Uint8Array(combinedBuffer.slice(0, IV_LENGTH_BYTES));
    const encryptedContentOnly = new Uint8Array(combinedBuffer.slice(IV_LENGTH_BYTES));

    const decryptedCombinedPayload = await crypto.subtle.decrypt(
      {
        name: ALGORITHM_NAME,
        iv: iv,
      },
      key,
      encryptedContentOnly,
    );

    const decryptedMetadataBuffer = new Uint8Array(decryptedCombinedPayload).slice(0, METADATA_HEADER_LENGTH_BYTES);
    const decryptedFileBuffer = decryptedCombinedPayload.slice(METADATA_HEADER_LENGTH_BYTES);

    const metadataJson = new TextDecoder().decode(decryptedMetadataBuffer).replace(/\0/g, '');
    let metadata: FileMetadataHeader = { originalFileName: 'downloaded_file', originalContentType: 'application/octet-stream' };
    try {
        metadata = JSON.parse(metadataJson);
    } catch (e) {
        console.warn("Failed to parse embedded metadata. Using fallback.", e);
    }


    return {
        decryptedBlob: new Blob([decryptedFileBuffer]),
        metadata: metadata
    };
  }
}