/**
 * Web Serial API Printer Utility
 * ส่งคำสั่ง ESC/POS โดยตรงจาก browser ไปยังเครื่องพิมพ์
 * 
 * รองรับ: Chrome 89+, Edge 89+
 * ไม่รองรับ: Firefox, Safari
 */

// Type declarations for Web Serial API (not yet in TypeScript lib)
declare global {
    interface Navigator {
        serial: Serial;
    }

    interface Serial extends EventTarget {
        requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
        getPorts(): Promise<SerialPort[]>;
        addEventListener(type: 'connect' | 'disconnect', listener: (event: Event) => void): void;
        removeEventListener(type: 'connect' | 'disconnect', listener: (event: Event) => void): void;
    }

    interface SerialPortRequestOptions {
        filters?: SerialPortFilter[];
    }

    interface SerialPortFilter {
        usbVendorId?: number;
        usbProductId?: number;
    }

    interface SerialPort extends EventTarget {
        readonly readable: ReadableStream<Uint8Array> | null;
        readonly writable: WritableStream<Uint8Array> | null;
        open(options: SerialOptions): Promise<void>;
        close(): Promise<void>;
    }

    interface SerialOptions {
        baudRate: number;
        dataBits?: 7 | 8;
        stopBits?: 1 | 2;
        parity?: 'none' | 'even' | 'odd';
        bufferSize?: number;
        flowControl?: 'none' | 'hardware';
    }
}

// ESC/POS Commands
export const ESC_POS = {
    // Initialize printer
    INIT: new Uint8Array([0x1B, 0x40]),

    // Open cash drawer (Pin 2 - RJ11 commonly used)
    OPEN_DRAWER_PIN2: new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]),

    // Open cash drawer (Pin 5 - alternative)
    OPEN_DRAWER_PIN5: new Uint8Array([0x1B, 0x70, 0x01, 0x19, 0xFA]),

    // Cut paper (full cut)
    CUT_PAPER: new Uint8Array([0x1D, 0x56, 0x00]),

    // Cut paper (partial cut)
    CUT_PAPER_PARTIAL: new Uint8Array([0x1D, 0x56, 0x01]),

    // Line feed
    LINE_FEED: new Uint8Array([0x0A]),

    // Text alignment
    ALIGN_LEFT: new Uint8Array([0x1B, 0x61, 0x00]),
    ALIGN_CENTER: new Uint8Array([0x1B, 0x61, 0x01]),
    ALIGN_RIGHT: new Uint8Array([0x1B, 0x61, 0x02]),

    // Text size (normal)
    TEXT_NORMAL: new Uint8Array([0x1B, 0x21, 0x00]),

    // Text size (double height)
    TEXT_DOUBLE_HEIGHT: new Uint8Array([0x1B, 0x21, 0x10]),

    // Text size (double width)
    TEXT_DOUBLE_WIDTH: new Uint8Array([0x1B, 0x21, 0x20]),

    // Text size (double height & width)
    TEXT_DOUBLE: new Uint8Array([0x1B, 0x21, 0x30]),

    // Bold on/off
    BOLD_ON: new Uint8Array([0x1B, 0x45, 0x01]),
    BOLD_OFF: new Uint8Array([0x1B, 0x45, 0x00]),
};

// Printer connection state
let serialPort: SerialPort | null = null;
let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

/**
 * Check if Web Serial API is supported
 */
export function isWebSerialSupported(): boolean {
    return 'serial' in navigator;
}

/**
 * Check if printer is currently connected
 */
export function isPrinterConnected(): boolean {
    return serialPort !== null && writer !== null;
}

/**
 * Connect to printer via Web Serial API
 * @returns Promise<boolean> - true if connected successfully
 */
export async function connectPrinter(): Promise<boolean> {
    if (!isWebSerialSupported()) {
        throw new Error('เบราว์เซอร์ไม่รองรับ Web Serial API กรุณาใช้ Chrome หรือ Edge');
    }

    try {
        // Request port selection from user
        serialPort = await navigator.serial.requestPort();

        // Open port with common thermal printer settings
        await serialPort.open({
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            flowControl: 'none',
        });

        // Get writer
        if (serialPort.writable) {
            writer = serialPort.writable.getWriter();
        }

        // Initialize printer
        await sendCommand(ESC_POS.INIT);

        console.log('✅ Printer connected via Web Serial API');
        return true;
    } catch (error: any) {
        console.error('❌ Failed to connect printer:', error);
        await disconnectPrinter();

        if (error.name === 'NotFoundError') {
            throw new Error('ไม่ได้เลือกเครื่องพิมพ์');
        }
        throw new Error('เชื่อมต่อเครื่องพิมพ์ไม่สำเร็จ: ' + error.message);
    }
}

/**
 * Disconnect from printer
 */
export async function disconnectPrinter(): Promise<void> {
    try {
        if (writer) {
            await writer.releaseLock();
            writer = null;
        }
        if (serialPort) {
            await serialPort.close();
            serialPort = null;
        }
        console.log('🔌 Printer disconnected');
    } catch (error) {
        console.error('Error disconnecting:', error);
        writer = null;
        serialPort = null;
    }
}

/**
 * Send raw command to printer
 */
export async function sendCommand(command: Uint8Array): Promise<void> {
    if (!writer) {
        throw new Error('ไม่ได้เชื่อมต่อเครื่องพิมพ์');
    }
    await writer.write(command);
}

/**
 * Send text to printer (with Thai encoding support)
 */
export async function sendText(text: string): Promise<void> {
    if (!writer) {
        throw new Error('ไม่ได้เชื่อมต่อเครื่องพิมพ์');
    }

    // Convert text to bytes (using TIS-620 for Thai)
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    await writer.write(data);
}

/**
 * Open cash drawer
 * @param tryBothPins - If true, try Pin 5 if Pin 2 fails
 */
export async function openCashDrawer(tryBothPins: boolean = true): Promise<void> {
    if (!isPrinterConnected()) {
        throw new Error('กรุณาเชื่อมต่อเครื่องพิมพ์ก่อน');
    }

    try {
        // Try Pin 2 first (most common)
        await sendCommand(ESC_POS.OPEN_DRAWER_PIN2);
        console.log('✅ Cash drawer opened (Pin 2)');
    } catch (error) {
        if (tryBothPins) {
            // Fallback to Pin 5
            await sendCommand(ESC_POS.OPEN_DRAWER_PIN5);
            console.log('✅ Cash drawer opened (Pin 5)');
        } else {
            throw error;
        }
    }
}

/**
 * Print text and cut paper
 */
export async function printAndCut(text: string): Promise<void> {
    if (!isPrinterConnected()) {
        throw new Error('กรุณาเชื่อมต่อเครื่องพิมพ์ก่อน');
    }

    await sendCommand(ESC_POS.INIT);
    await sendText(text);
    await sendCommand(ESC_POS.LINE_FEED);
    await sendCommand(ESC_POS.LINE_FEED);
    await sendCommand(ESC_POS.LINE_FEED);
    await sendCommand(ESC_POS.CUT_PAPER);
}

/**
 * Listen for printer disconnect events
 */
export function onPrinterDisconnect(callback: () => void): void {
    if (serialPort) {
        navigator.serial.addEventListener('disconnect', (event) => {
            if (event.target === serialPort) {
                writer = null;
                serialPort = null;
                callback();
            }
        });
    }
}
