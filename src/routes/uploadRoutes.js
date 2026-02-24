import express from 'express';
import {
  uploadCaseDocument,
  uploadAppointmentDocument,
  uploadMultipleCaseDocuments,
  deleteCaseDocument,
  getFileInfo,
  caseDocumentUpload,
  appointmentDocumentUpload,
  profilePhotoUpload
} from '../controllers/uploadController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

/**
 * File Upload Routes
 * Base path: /api/uploads
 */

/**
 * @route   POST /api/uploads/case-documents
 * @desc    Upload a single case document
 * @access  Private
 * @example
 * POST /api/uploads/case-documents
 * Authorization: Bearer <token>
 * Content-Type: multipart/form-data
 * caseId=60f7b3b3b3b3b3b3b3b3b3b5
 * file=<document>
 * description=Contract agreement
 */
router.post('/case-documents', authenticate, caseDocumentUpload.single('file'), uploadCaseDocument);

/**
 * @route   POST /api/uploads/case-documents/multiple
 * @desc    Upload multiple case documents
 * @access  Private
 * @example
 * POST /api/uploads/case-documents/multiple
 * Authorization: Bearer <token>
 * Content-Type: multipart/form-data
 * caseId=60f7b3b3b3b3b3b3b3b3b3b5
 * files=<documents_array>
 */
router.post('/case-documents/multiple', authenticate, caseDocumentUpload.array('files', 10), uploadMultipleCaseDocuments);

/**
 * @route   POST /api/uploads/appointment-documents
 * @desc    Upload appointment document
 * @access  Private
 * @example
 * POST /api/uploads/appointment-documents
 * Authorization: Bearer <token>
 * Content-Type: multipart/form-data
 * appointmentId=60f7b3b3b3b3b3b3b3b3b3b6
 * file=<document>
 */
router.post('/appointment-documents', authenticate, appointmentDocumentUpload.single('file'), uploadAppointmentDocument);

/**
 * @route   DELETE /api/uploads/case-documents/:documentId
 * @desc    Delete case document
 * @access  Private
 * @example
 * DELETE /api/uploads/case-documents/60f7b3b3b3b3b3b3b3b3b3b7
 * Authorization: Bearer <token>
 * {
 *   "caseId": "60f7b3b3b3b3b3b3b3b3b3b5"
 * }
 */
router.delete('/case-documents/:documentId', authenticate, deleteCaseDocument);

/**
 * @route   GET /api/uploads/file-info
 * @desc    Get file information
 * @access  Private
 * @example
 * GET /api/uploads/file-info?fileUrl=/uploads/case-documents/document.pdf
 * Authorization: Bearer <token>
 */
router.get('/file-info', authenticate, getFileInfo);

export default router;
