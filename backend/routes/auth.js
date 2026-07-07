import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

// In-memory OTP store: { email: { otp, expiresAt } }
const otpStore = new Map();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'Cybershield1104@gmail.com',
        pass: 'wlwl kotv fuhn kvfa',
    },
});

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
    const { email, userName } = req.body;

    if (!email) return res.status(400).json({ error: 'Email is required' });

    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(email, { otp, expiresAt });

    try {
        await transporter.sendMail({
            from: '"CyberShield AI" <Cybershield1104@gmail.com>',
            to: email,
            subject: '🔐 CyberShield Login OTP',
            html: `
        <div style="font-family: monospace; background: #03060f; color: #00f3ff; padding: 32px; border-radius: 12px; border: 1px solid #00f3ff33;">
          <h2 style="color: #00f3ff; letter-spacing: 0.2em;">CYBERSHIELD AI</h2>
          <p style="color: #94a3b8;">Hello ${userName || 'Operator'},</p>
          <p style="color: #94a3b8;">Your One-Time Password (OTP) for login is:</p>
          <div style="background: #050a14; border: 1px solid #00f3ff44; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; color: #00f3ff; letter-spacing: 0.3em;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 12px;">⏱ This OTP expires in <strong style="color: #f97316;">5 minutes</strong>.</p>
          <p style="color: #94a3b8; font-size: 12px;">If you did not request this, ignore this email.</p>
          <hr style="border-color: #00f3ff22; margin: 20px 0;" />
          <p style="color: #334155; font-size: 11px;">CyberShield AI · Secure Access Portal</p>
        </div>
      `,
        });

        console.log(`[2FA] OTP sent to ${email}: ${otp}`);
        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (err) {
        console.error('[2FA] Email send failed:', err.message);
        res.status(500).json({ error: 'Failed to send OTP email', details: err.message });
    }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    const record = otpStore.get(email);

    if (!record) return res.status(400).json({ error: 'No OTP found for this email. Please request a new one.' });

    if (Date.now() > record.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (record.otp !== otp.toString()) {
        return res.status(400).json({ error: 'Invalid OTP. Please check and try again.' });
    }

    otpStore.delete(email); // OTP used, remove it
    res.json({ success: true, message: 'OTP verified successfully' });
});

export default router;