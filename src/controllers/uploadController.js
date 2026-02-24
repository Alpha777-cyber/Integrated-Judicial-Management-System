import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import Case from '../models/Case.js';
import Appointment from '../models/Appointment.js';

/**
 * File Upload Controller
 * Handles file uploads for cases, appointments, and user profiles
 */

// Configure storage for different file types
const createStorage = (destination) => {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      // Create directory if it doesn't exist
      const uploadPath = `uploads/${destination}`;
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `${destination}-${uniqueSuffix}${ext}`);
    }
  });
};

// File filter for allowed file types
const createFileFilter = (allowedTypes) => {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;

    // Check file extension and MIME type
    const isAllowedType = allowedTypes.some(type => {
      if (type.includes('/')) {
        return mimeType === type;
      }
      return ext === `.${type}`;
    });

    if (isAllowedType) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
  };
};

// Configure multer for different upload types
const caseDocumentUpload = multer({
  storage: createStorage('case-documents'),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: createFileFilter(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'])
});

const appointmentDocumentUpload = multer({
  storage: createStorage('appointment-documents'),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: createFileFilter(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'])
});

const profilePhotoUpload = multer({
  storage: createStorage('profiles'),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: createFileFilter(['jpg', 'jpeg', 'png', 'image/jpeg', 'image/png'])
});

/**
 * Upload case document
 * @route POST /api/uploads/case-documents
 * @access Private
 */
export const uploadCaseDocument = async (req, res) => {
  try {
    const { caseId } = req.body;
    const userId = req.user._id;

    if (!caseId) {
      return res.status(400).json({
        success: false,
        message: 'Case ID is required'
      });
    }

    // Verify case exists and user has access
    const caseItem = await Case.findById(caseId);
    if (!caseItem) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Check permissions
    const hasAccess = 
      caseItem.userId.toString() === userId.toString() ||
      (caseItem.assignedLawyer && caseItem.assignedLawyer.toString() === userId.toString()) ||
      (caseItem.assignedJudge && caseItem.assignedJudge.toString() === userId.toString()) ||
      (caseItem.assignedClerk && caseItem.assignedClerk.toString() === userId.toString()) ||
      req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Create document object
    const documentData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      fileUrl: `/uploads/case-documents/${req.file.filename}`,
      uploadedBy: userId,
      description: req.body.description || ''
    };

    // Add document to case
    await caseItem.addDocument(documentData);

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        document: documentData
      }
    });
  } catch (error) {
    console.error('Upload case document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Upload appointment document
 * @route POST /api/uploads/appointment-documents
 * @access Private
 */
export const uploadAppointmentDocument = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const userId = req.user._id;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID is required'
      });
    }

    // Verify appointment exists and user has access
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check permissions
    const hasAccess = 
      appointment.userId.toString() === userId.toString() ||
      appointment.lawyerId.toString() === userId.toString() ||
      req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Create document object
    const documentData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileUrl: `/uploads/appointment-documents/${req.file.filename}`,
      uploadedBy: userId
    };

    // Add document to appointment
    await appointment.addDocument(documentData);

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        document: documentData
      }
    });
  } catch (error) {
    console.error('Upload appointment document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Upload multiple case documents
 * @route POST /api/uploads/case-documents/multiple
 * @access Private
 */
export const uploadMultipleCaseDocuments = async (req, res) => {
  try {
    const { caseId } = req.body;
    const userId = req.user._id;

    if (!caseId) {
      return res.status(400).json({
        success: false,
        message: 'Case ID is required'
      });
    }

    // Verify case exists and user has access
    const caseItem = await Case.findById(caseId);
    if (!caseItem) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Check permissions
    const hasAccess = 
      caseItem.userId.toString() === userId.toString() ||
      (caseItem.assignedLawyer && caseItem.assignedLawyer.toString() === userId.toString()) ||
      (caseItem.assignedJudge && caseItem.assignedJudge.toString() === userId.toString()) ||
      (caseItem.assignedClerk && caseItem.assignedClerk.toString() === userId.toString()) ||
      req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedDocuments = [];

    // Process each file
    for (const file of req.files) {
      const documentData = {
        filename: file.filename,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        fileUrl: `/uploads/case-documents/${file.filename}`,
        uploadedBy: userId,
        description: ''
      };

      await caseItem.addDocument(documentData);
      uploadedDocuments.push(documentData);
    }

    res.status(201).json({
      success: true,
      message: `${uploadedDocuments.length} documents uploaded successfully`,
      data: {
        documents: uploadedDocuments
      }
    });
  } catch (error) {
    console.error('Upload multiple case documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload documents',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete case document
 * @route DELETE /api/uploads/case-documents/:documentId
 * @access Private
 */
export const deleteCaseDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { caseId } = req.body;
    const userId = req.user._id;

    if (!caseId) {
      return res.status(400).json({
        success: false,
        message: 'Case ID is required'
      });
    }

    // Verify case exists and user has access
    const caseItem = await Case.findById(caseId);
    if (!caseItem) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Check permissions
    const hasAccess = 
      caseItem.userId.toString() === userId.toString() ||
      (caseItem.assignedLawyer && caseItem.assignedLawyer.toString() === userId.toString()) ||
      (caseItem.assignedJudge && caseItem.assignedJudge.toString() === userId.toString()) ||
      (caseItem.assignedClerk && caseItem.assignedClerk.toString() === userId.toString()) ||
      req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Find and remove document
    const document = caseItem.documents.id(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete physical file
    const filePath = path.join(process.cwd(), document.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove document from case
    caseItem.documents.pull(documentId);
    await caseItem.save();

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete case document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get file information
 * @route GET /api/uploads/file-info
 * @access Private
 */
export const getFileInfo = async (req, res) => {
  try {
    const { fileUrl } = req.query;

    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'File URL is required'
      });
    }

    const filePath = path.join(process.cwd(), fileUrl);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const stats = fs.statSync(filePath);
    const fileInfo = {
      name: path.basename(filePath),
      size: stats.size,
      type: path.extname(filePath),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime
    };

    res.status(200).json({
      success: true,
      data: {
        file: fileInfo
      }
    });
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get file information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export middleware and controllers
export {
  caseDocumentUpload,
  appointmentDocumentUpload,
  profilePhotoUpload
};

export default {
  uploadCaseDocument,
  uploadAppointmentDocument,
  uploadMultipleCaseDocuments,
  deleteCaseDocument,
  getFileInfo,
  caseDocumentUpload,
  appointmentDocumentUpload,
  profilePhotoUpload
};
