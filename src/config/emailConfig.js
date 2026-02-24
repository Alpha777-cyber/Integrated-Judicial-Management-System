/**
 * Email Configuration
 * Centralized email service setup for the application
 */

import nodemailer from 'nodemailer';

// Email service configuration
export const emailConfig = {
  service: process.env.EMAIL_SERVICE || 'gmail',
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

// Create email transporter
export const createTransporter = () => {
  return nodemailer.createTransporter(emailConfig);
};

// Email templates
export const emailTemplates = {
  welcome: (userName) => ({
    subject: 'Welcome to UBUTABERAhub',
    html: `
      <h1>Welcome, ${userName}!</h1>
      <p>Thank you for joining UBUTABERAhub. We're excited to have you on board.</p>
      <p>You can now access our legal services and connect with professional lawyers.</p>
      <p>Best regards,<br/>The UBUTABERAhub Team</p>
    `,
  }),
  
  appointmentConfirmation: (userName, lawyerName, date) => ({
    subject: 'Appointment Confirmed',
    html: `
      <h1>Appointment Confirmed!</h1>
      <p>Hello ${userName},</p>
      <p>Your appointment with <strong>${lawyerName}</strong> has been confirmed for:</p>
      <p><strong>${date}</strong></p>
      <p>Please make sure to attend on time. If you need to reschedule, please contact us.</p>
      <p>Best regards,<br/>The UBUTABERAhub Team</p>
    `,
  }),
  
  passwordReset: (resetToken) => ({
    subject: 'Password Reset Request',
    html: `
      <h1>Password Reset</h1>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br/>The UBUTABERAhub Team</p>
    `,
  }),
};

// Send email function
export const sendEmail = async (to, template) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      ...template,
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

export default {
  emailConfig,
  createTransporter,
  emailTemplates,
  sendEmail,
};
