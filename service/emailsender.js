const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // Use 'true' for port 465 (SSL)
    auth: {
        user: process.env.MAIL,
        pass: process.env.PASS
    }
});

async function sendOTP(email, OTP) {
    try {
        const mailOptions = {
            from: process.env.MAIL, // Use sender's email
            to: email,
            subject: "Verification Code from Choco Dwelling",
            text: `Enter the One Time Password ${OTP} to verify your account.`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully: ${info.response}`);
    } catch (error) {
        console.error(`Error while sending mail: ${error.message}`);
    }
}

module.exports = sendOTP;
