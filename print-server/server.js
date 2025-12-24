/**
 * Local Print Server สำหรับ POS
 * - เปิดลิ้นชักเก็บเงินอัตโนมัติ
 * - ส่งคำสั่ง ESC/POS ไปที่ Xprinter
 * 
 * วิธีใช้:
 * 1. cd print-server
 * 2. npm install
 * 3. แก้ไข PRINTER_NAME ให้ตรงกับชื่อเครื่องปริ้น
 * 4. npm start
 */

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 9100;

// ⚠️ แก้ไขชื่อนี้ให้ตรงกับชื่อเครื่องปริ้นใน Windows
// ดูจาก Settings > Printers & scanners > คลิกที่ Printer > Printer properties > Sharing tab > Share name
const PRINTER_NAME = 'POS-80';

// Enable CORS for web app
app.use(cors());
app.use(express.json());

// ESC/POS Commands
const COMMANDS = {
    OPEN_DRAWER_PIN2: Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]),
    OPEN_DRAWER_PIN5: Buffer.from([0x1B, 0x70, 0x01, 0x19, 0xFA]),
    CUT_PAPER: Buffer.from([0x1D, 0x56, 0x00]),
};

/**
 * ส่งคำสั่ง raw ไปที่เครื่องปริ้น
 */
function sendToPrinter(data, callback) {
    const tempFile = path.join(__dirname, 'temp_print.bin');

    // เขียนข้อมูลลงไฟล์ชั่วคราว
    fs.writeFileSync(tempFile, data);

    // ส่งไปที่เครื่องปริ้นผ่าน Windows print command
    const command = `copy /b "${tempFile}" "\\\\%COMPUTERNAME%\\${PRINTER_NAME}"`;

    console.log('📤 Running command:', command);

    // เพิ่ม timeout 10 วินาที ป้องกันค้าง
    const child = exec(command, { shell: 'cmd.exe', timeout: 10000 }, (error, stdout, stderr) => {
        // ลบไฟล์ชั่วคราว
        try { fs.unlinkSync(tempFile); } catch (e) { }

        if (error) {
            console.error('❌ Print error:', error.message);
            if (error.killed) {
                console.error('⏱️ Command timed out! Check printer name.');
            }
            callback(error);
        } else {
            console.log('✅ Sent to printer successfully');
            console.log('   stdout:', stdout);
            callback(null);
        }
    });
}

// ========== API Endpoints ==========

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Print Server Running',
        printer: PRINTER_NAME,
        endpoints: ['/drawer', '/drawer/test']
    });
});

// เปิดลิ้นชัก
app.post('/drawer', (req, res) => {
    console.log('📦 Opening cash drawer...');

    sendToPrinter(COMMANDS.OPEN_DRAWER_PIN2, (error) => {
        if (error) {
            // ลอง Pin 5 ถ้า Pin 2 ไม่ได้
            sendToPrinter(COMMANDS.OPEN_DRAWER_PIN5, (error2) => {
                if (error2) {
                    res.status(500).json({ success: false, error: error2.message });
                } else {
                    res.json({ success: true, message: 'Drawer opened (Pin 5)' });
                }
            });
        } else {
            res.json({ success: true, message: 'Drawer opened (Pin 2)' });
        }
    });
});

// ทดสอบเปิดลิ้นชัก (GET สำหรับทดสอบง่าย)
app.get('/drawer/test', (req, res) => {
    console.log('🧪 Testing cash drawer...');

    sendToPrinter(COMMANDS.OPEN_DRAWER_PIN2, (error) => {
        if (error) {
            res.status(500).json({ success: false, error: error.message });
        } else {
            res.json({ success: true, message: 'Drawer test successful!' });
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(50));
    console.log('🖨️  POS Print Server');
    console.log('='.repeat(50));
    console.log(`✅ Server running at: http://localhost:${PORT}`);
    console.log(`🖨️  Printer: ${PRINTER_NAME}`);
    console.log('');
    console.log('📋 Endpoints:');
    console.log(`   POST http://localhost:${PORT}/drawer     - เปิดลิ้นชัก`);
    console.log(`   GET  http://localhost:${PORT}/drawer/test - ทดสอบลิ้นชัก`);
    console.log('');
    console.log('⚠️  อย่าลืมแก้ PRINTER_NAME ให้ตรงกับชื่อเครื่องปริ้น!');
    console.log('='.repeat(50));
});
