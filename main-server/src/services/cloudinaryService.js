const cloudinary = require("../config/cloudinary");

const uploadBufferToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });

exports.uploadSingleBuffer = async (file, folder) => {
  if (!file?.buffer) {
    throw new Error("No image buffer provided");
  }
  return uploadBufferToCloudinary(file.buffer, folder);
};

exports.uploadMultipleBuffers = async (files, folder) => {
  return Promise.all(
    files.map(file => uploadBufferToCloudinary(file.buffer, folder))
  );
};
