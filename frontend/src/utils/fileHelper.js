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