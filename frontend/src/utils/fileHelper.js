const isMobileApp = typeof window !== 'undefined' && window.ReactNativeWebView;

/**
 * Utility to download a file from a URL
 * @param {string} url - The URL of the file to download
 * @param {string} fileName - The desired name for the downloaded file
 */


// export const downloadFile = (url, fileName) => {
//     const link = document.createElement("a");
//     link.href = url;
//     link.download = fileName;
//     link.target = "_blank";
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
// };

export const downloadFile = async (url, fileName) => {
    if (isMobileApp) {
        // If it's a blob URL, we need to fetch it and convert to base64
        if (url.startsWith('blob:')) {
            const res = await fetch(url);
            const blob = await res.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'download',
                    payload: { base64, fileName, mimeType: blob.type }
                }));
            };
            reader.readAsDataURL(blob);
            return;
        }

        // For regular URLs, just send the JSON to top level
        // We'll just try to open it in browser or handle it
        window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'download_url',
            payload: { url, fileName }
        }));
    } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

/**
 * Utility to print a PDF blob directly using a hidden iframe without opening a new tab/window.
 * @param {Blob|ArrayBuffer|Uint8Array|string} blobOrUrl - The PDF data blob or URL
 */
export const printPdfBlob = (blobOrUrl) => {
    const isMobileApp = typeof window !== 'undefined' && window.ReactNativeWebView;

    if (isMobileApp) {
        if (typeof blobOrUrl === 'string' && blobOrUrl.startsWith('blob:')) {
            fetch(blobOrUrl)
                .then(res => res.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64 = reader.result.split(',')[1];
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'print',
                            payload: { base64 }
                        }));
                    };
                    reader.readAsDataURL(blob);
                });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'print',
                payload: { base64 }
            }));
        };
        reader.readAsDataURL(blobOrUrl instanceof Blob ? blobOrUrl : new Blob([blobOrUrl], { type: 'application/pdf' }));
        return;
    }

    const url = typeof blobOrUrl === 'string'
        ? blobOrUrl
        : window.URL.createObjectURL(blobOrUrl instanceof Blob ? blobOrUrl : new Blob([blobOrUrl], { type: 'application/pdf' }));

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0.01';
    iframe.style.border = '0';
    iframe.style.pointerEvents = 'none';
    iframe.src = url;

    document.body.appendChild(iframe);

    let cleanedUp = false;
    const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        try {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
            if (typeof blobOrUrl !== 'string') {
                window.URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error("Print cleanup error", e);
        }
    };

    iframe.onload = () => {
        setTimeout(() => {
            try {
                if (iframe.contentWindow) {
                    iframe.contentWindow.addEventListener('afterprint', cleanup);
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                }
            } catch (err) {
                console.error("Print iframe error:", err);
            }
            // Long fallback cleanup (5 minutes) so URL isn't revoked while print dialog is open
            setTimeout(cleanup, 300000);
        }, 300);
    };
};