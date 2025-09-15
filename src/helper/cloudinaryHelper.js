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

module.exports = {
  uploadBufferToCloudinary,
  publicIdWithoutExtensionFromUrl,
  deleteFileFromCloudinary,
};
