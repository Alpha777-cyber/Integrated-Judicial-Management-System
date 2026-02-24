/**
 * Cloudinary Configuration
 * Centralized cloud storage setup for the application
 */

import { v2 as cloudinary } from 'cloudinary';

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload configuration options
export const uploadOptions = {
  folder: 'ubutaberahub',
  allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
  max_file_size: 5000000, // 5MB
  resource_type: 'auto',
};

// Upload file to Cloudinary
export const uploadFile = async (file, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      ...uploadOptions,
      ...options,
    });
    
    console.log('✅ File uploaded successfully:', result.public_id);
    return result;
  } catch (error) {
    console.error('❌ Error uploading file:', error);
    throw error;
  }
};

// Delete file from Cloudinary
export const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('✅ File deleted successfully:', publicId);
    return result;
  } catch (error) {
    console.error('❌ Error deleting file:', error);
    throw error;
  }
};

// Get file URL
export const getFileUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, {
    secure: true,
    ...options,
  });
};

// Upload multiple files
export const uploadMultipleFiles = async (files, options = {}) => {
  try {
    const uploadPromises = files.map(file => uploadFile(file, options));
    const results = await Promise.all(uploadPromises);
    console.log(`✅ ${results.length} files uploaded successfully`);
    return results;
  } catch (error) {
    console.error('❌ Error uploading multiple files:', error);
    throw error;
  }
};

export default cloudinary;
