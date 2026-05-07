const cloudinary = require('../config/cloudinary');

/**
 * Deletes a file from Cloudinary given its URL.
 * Extracts the public_id from the URL.
 * @param {string} url - The Cloudinary URL of the file.
 * @returns {Promise} - Resolves with the result of the deletion.
 */
const deleteFromCloudinary = async (url) => {
    if (!url || typeof url !== 'string') return;
    try {
        // Example URLs:
        // https://res.cloudinary.com/cloud_name/image/upload/v12345/folder/id.jpg
        // https://res.cloudinary.com/cloud_name/raw/upload/v12345/folder/id.pdf

        const parts = url.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex === -1) return;

        // Resource type is the part before 'upload' (image, raw, video)
        const resourceType = parts[uploadIndex - 1];

        // Public ID is everything after the version (vXXXXXX) or after the 'upload' part if no version
        const nextPart = parts[uploadIndex + 1];
        const versionIndex = nextPart.startsWith('v') ? uploadIndex + 1 : uploadIndex;
        const publicIdWithExt = parts.slice(versionIndex + 1).join('/');

        let publicId = publicIdWithExt;
        if (resourceType === 'image') {
            // Remove extension for images as Cloudinary refers to them without it in the API
            publicId = publicIdWithExt.split('.').slice(0, -1).join('.');
        }

        console.log(`Deleting from Cloudinary: [${resourceType}] ${publicId}`);
        return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
        console.error('Cloudinary Deletion Error:', err);
    }
};

module.exports = { deleteFromCloudinary };
