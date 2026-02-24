import nodemailer from 'nodemailer';
import crypto from 'crypto';

/**
 * Email utility functions for sending notifications
 */

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Send welcome email to new users
 * @param {object} user - User object
 * @param {string} verificationToken - Email verification token
 */
export const sendWelcomeEmail = async (user, verificationToken) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: `"UBUTABERAhub" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Welcome to UBUTABERAhub - Verify Your Email',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to UBUTABERAhub</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1E293B; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #1E293B; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>UBUTABERAhub</h1>
              <p>Rwanda's Digital Justice Platform</p>
            </div>
            <div class="content">
              <h2>Welcome, ${user.name}!</h2>
              <p>Thank you for registering with UBUTABERAhub. Your account has been created successfully.</p>
              <p>Please verify your email address to activate your account and start using our platform.</p>
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
              <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
              <p>${verificationUrl}</p>
              <p>This verification link will expire in 24 hours.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 UBUTABERAhub. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${user.email}`);
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    throw error;
  }
};

/**
 * Send password reset email
 * @param {object} user - User object
 * @param {string} resetToken - Password reset token
 */
export const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"UBUTABERAhub" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Request - UBUTABERAhub',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - UBUTABERAhub</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1E293B; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>UBUTABERAhub</h1>
              <p>Password Reset Request</p>
            </div>
            <div class="content">
              <h2>Hello, ${user.name}!</h2>
              <p>We received a request to reset your password for your UBUTABERAhub account.</p>
              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
              <p>${resetUrl}</p>
              <div class="warning">
                <p><strong>Important:</strong></p>
                <ul>
                  <li>This reset link will expire in 1 hour.</li>
                  <li>If you didn't request this password reset, please ignore this email.</li>
                  <li>Never share this link with anyone.</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2024 UBUTABERAhub. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${user.email}`);
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw error;
  }
};

/**
 * Send appointment confirmation email
 * @param {object} appointment - Appointment object
 * @param {object} user - User object
 * @param {object} lawyer - Lawyer object
 */
export const sendAppointmentConfirmation = async (appointment, user, lawyer) => {
  try {
    const transporter = createTransporter();
    
    const appointmentUrl = `${process.env.FRONTEND_URL}/appointments`;
    
    const mailOptions = {
      from: `"UBUTABERAhub" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Appointment Confirmation - UBUTABERAhub',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Confirmation - UBUTABERAhub</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1E293B; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .appointment-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>UBUTABERAhub</h1>
              <p>Appointment Confirmation</p>
            </div>
            <div class="content">
              <h2>Appointment Confirmed!</h2>
              <p>Hello, ${user.name}!</p>
              <p>Your appointment has been confirmed. Here are the details:</p>
              
              <div class="appointment-details">
                <h3>Appointment Details</h3>
                <p><strong>Title:</strong> ${appointment.title}</p>
                <p><strong>Type:</strong> ${appointment.type}</p>
                <p><strong>Date:</strong> ${appointment.date.toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${appointment.startTime} - ${appointment.endTime}</p>
                <p><strong>Lawyer:</strong> ${lawyer.name}</p>
                <p><strong>Fee:</strong> RWF ${appointment.fee.toLocaleString()}</p>
                ${appointment.meetingUrl ? `<p><strong>Meeting URL:</strong> <a href="${appointment.meetingUrl}">Join Meeting</a></p>` : ''}
                ${appointment.location ? `<p><strong>Location:</strong> ${appointment.location}</p>` : ''}
              </div>
              
              <a href="${appointmentUrl}" class="button">View Appointments</a>
              
              <p>Please make sure to attend the appointment on time. If you need to reschedule or cancel, please do so at least 24 hours in advance.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 UBUTABERAhub. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Appointment confirmation email sent to ${user.email}`);
  } catch (error) {
    console.error('❌ Error sending appointment confirmation email:', error);
    throw error;
  }
};

/**
 * Send appointment reminder email
 * @param {object} appointment - Appointment object
 * @param {object} user - User object
 * @param {object} lawyer - Lawyer object
 */
export const sendAppointmentReminder = async (appointment, user, lawyer) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"UBUTABERAhub" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Appointment Reminder - UBUTABERAhub',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Reminder - UBUTABERAhub</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1E293B; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .reminder { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>UBUTABERAhub</h1>
              <p>Appointment Reminder</p>
            </div>
            <div class="content">
              <h2>Reminder: Upcoming Appointment</h2>
              <p>Hello, ${user.name}!</p>
              
              <div class="reminder">
                <p>This is a friendly reminder that you have an appointment scheduled for tomorrow.</p>
              </div>
              
              <p><strong>Appointment Details:</strong></p>
              <ul>
                <li><strong>Title:</strong> ${appointment.title}</li>
                <li><strong>Type:</strong> ${appointment.type}</li>
                <li><strong>Date:</strong> ${appointment.date.toLocaleDateString()}</li>
                <li><strong>Time:</strong> ${appointment.startTime} - ${appointment.endTime}</li>
                <li><strong>Lawyer:</strong> ${lawyer.name}</li>
                ${appointment.meetingUrl ? `<li><strong>Meeting URL:</strong> <a href="${appointment.meetingUrl}">Join Meeting</a></li>` : ''}
                ${appointment.location ? `<li><strong>Location:</strong> ${appointment.location}</li>` : ''}
              </ul>
              
              <p>Please make sure to be prepared and attend on time. If you need to make any changes, please contact us as soon as possible.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 UBUTABERAhub. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Appointment reminder email sent to ${user.email}`);
  } catch (error) {
    console.error('❌ Error sending appointment reminder email:', error);
    throw error;
  }
};

export default {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAppointmentConfirmation,
  sendAppointmentReminder
};
