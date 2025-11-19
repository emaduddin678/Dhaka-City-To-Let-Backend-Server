const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const uploadBufferToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const publicIdWithoutExtensionFromUrl = async (imageUrl) => {
  const pathSegments = imageUrl.split("/");
  const lastSegment = pathSegments[pathSegments.length - 1];
  //   const valueWithoutExtension = lastSegment.replace(".jpg", "");
  const valueWithoutExtension = lastSegment.split(".")[0];
  //   console.log(lastSegment);
  //   console.log(lastSegment.split("."));
  //   console.log(valueWithoutExtension);
  return valueWithoutExtension;
};
/**
 * Extracts public_id from Cloudinary URL
 * Example: https://res.cloudinary.com/demo/image/upload/v1234567890/users/abc123.jpg
 * Returns: users/abc123
 */
const getPublicIdFromUrl = (imageUrl) => {
  try {
    // Split URL and find the part after 'upload/'
    const parts = imageUrl.split("/upload/");
    if (parts.length < 2) return null;

    // Get everything after version (v1234567890/)
    const pathAfterUpload = parts[1];
    const pathParts = pathAfterUpload.split("/");

    // Remove version if present (starts with v followed by numbers)
    const startIndex = pathParts[0].match(/^v\d+$/) ? 1 : 0;

    // Reconstruct path without file extension
    const pathWithExtension = pathParts.slice(startIndex).join("/");
    const publicId =
      pathWithExtension.substring(0, pathWithExtension.lastIndexOf(".")) ||
      pathWithExtension;

    return publicId;
  } catch (error) {
    console.error("Error extracting public_id from URL:", error);
    return null;
  }
};
const deleteFileFromCloudinary = async (publicId, folderName, modelName) => {
  try {
    const { result } = await cloudinary.uploader.destroy(
      `EcommerceImageServer/${folderName}/${publicId}`
    );

    if (result !== "ok") {
      throw new Error(
        `${modelName} image was not deleted successfully from cloudinary. Please try again!`
      );
    }
    return true;
  } catch (error) {
    throw error;
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      throw new Error("Public ID is required to delete from Cloudinary");
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(
        `Image deletion failed. Cloudinary response: ${result.result}`
      );
    }

    return result;
  } catch (error) {
    console.error("Cloudinary deletion error:", error);
    throw error;
  }
};

module.exports = {
  uploadBufferToCloudinary,
  publicIdWithoutExtensionFromUrl,
  deleteFileFromCloudinary,
  getPublicIdFromUrl,
  deleteFromCloudinary,
};
