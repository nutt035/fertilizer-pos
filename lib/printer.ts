/**
 * Printer Utility - WebUSB + Web Serial API
 * ส่งคำสั่ง ESC/POS โดยตรงจาก browser ไปยังเครื่องพิมพ์
 * 
 * รองรับ: Chrome 89+, Edge 89+
 * ไม่รองรับ: Firefox, Safari
 * 
 * Supports:
 * - WebUSB API (for USB printers like POS-80)
 * - Web Serial API (for Serial/COM port printers)
 */

// Type declarations for Web Serial API and WebUSB API
declare global {
    interface Navigator {
        serial: Serial;
        usb: USB;
    }

    // Web Serial API types
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

    // WebUSB API types
    interface USB {
        requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
        getDevices(): Promise<USBDevice[]>;
    }

    interface USBDeviceRequestOptions {
        filters: USBDeviceFilter[];
    }

    interface USBDeviceFilter {
        vendorId?: number;
        productId?: number;
        classCode?: number;
        subclassCode?: number;
        protocolCode?: number;
        serialNumber?: string;
    }

    interface USBDevice {
        readonly vendorId: number;
        readonly productId: number;
        readonly productName?: string;
        readonly manufacturerName?: string;
        readonly configuration: USBConfiguration | null;
        open(): Promise<void>;
        close(): Promise<void>;
        selectConfiguration(configurationValue: number): Promise<void>;
        claimInterface(interfaceNumber: number): Promise<void>;
        releaseInterface(interfaceNumber: number): Promise<void>;
        transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
        transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
    }

    interface USBConfiguration {
        readonly configurationValue: number;
        readonly interfaces: USBInterface[];
    }

    interface USBInterface {
        readonly interfaceNumber: number;
        readonly alternate: USBAlternateInterface;
    }

    interface USBAlternateInterface {
        readonly alternateSetting: number;
        readonly interfaceClass: number;
        readonly endpoints: USBEndpoint[];
    }

    interface USBEndpoint {
        readonly endpointNumber: number;
        readonly direction: 'in' | 'out';
        readonly type: 'bulk' | 'interrupt' | 'isochronous';
    }

    interface USBOutTransferResult {
        readonly bytesWritten: number;
        readonly status: 'ok' | 'stall' | 'babble';
    }

    interface USBInTransferResult {
        readonly data: DataView;
        readonly status: 'ok' | 'stall' | 'babble';
    }
}

// ESC/POS Commands
export const ESC_POS = {
    INIT: new Uint8Array([0x1B, 0x40]),
    OPEN_DRAWER_PIN2: new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]),
    OPEN_DRAWER_PIN5: new Uint8Array([0x1B, 0x70, 0x01, 0x19, 0xFA]),
    CUT_PAPER: new Uint8Array([0x1D, 0x56, 0x00]),
    LINE_FEED: new Uint8Array([0x0A]),
    ALIGN_CENTER: new Uint8Array([0x1B, 0x61, 0x01]),
    TEXT_NORMAL: new Uint8Array([0x1B, 0x21, 0x00]),
    TEXT_DOUBLE: new Uint8Array([0x1B, 0x21, 0x30]),
    BOLD_ON: new Uint8Array([0x1B, 0x45, 0x01]),
    BOLD_OFF: new Uint8Array([0x1B, 0x45, 0x00]),
};

// Connection state
type ConnectionType = 'usb' | 'serial' | null;
let connectionType: ConnectionType = null;
let usbDevice: USBDevice | null = null;
let usbEndpoint: number = 1;
let serialPort: SerialPort | null = null;
let serialWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;

/**
 * Check if WebUSB is supported
 */
export function isWebUSBSupported(): boolean {
    return 'usb' in navigator;
}

/**
 * Check if Web Serial is supported
 */
export function isWebSerialSupported(): boolean {
    return 'serial' in navigator;
}

/**
 * Check if any printer API is supported
 */
export function isPrinterAPISupported(): boolean {
    return isWebUSBSupported() || isWebSerialSupported();
}

/**
 * Check if printer is connected
 */
export function isPrinterConnected(): boolean {
    return connectionType !== null;
}

/**
 * Get current connection type
 */
export function getConnectionType(): ConnectionType {
    return connectionType;
}

/**
 * Connect to printer - tries WebUSB first, then Web Serial
 */
export async function connectPrinter(): Promise<boolean> {
    // Try WebUSB first (for USB printers like POS-80)
    if (isWebUSBSupported()) {
        try {
            console.log('🔌 Trying WebUSB...');
            await connectWebUSB();
            return true;
        } catch (err: any) {
            console.log('WebUSB failed:', err.message);
            // Continue to try Serial
        }
    }

    // Fallback to Web Serial (for Serial/COM port printers)
    if (isWebSerialSupported()) {
        try {
            console.log('🔌 Trying Web Serial...');
            await connectSerial();
            return true;
        } catch (err: any) {
            console.log('Web Serial failed:', err.message);
            throw err;
        }
    }

    throw new Error('เบราว์เซอร์ไม่รองรับการเชื่อมต่อเครื่องพิมพ์');
}

/**
 * Connect via WebUSB
 */
async function connectWebUSB(): Promise<void> {
    // Request USB device
    usbDevice = await navigator.usb.requestDevice({
        filters: [] // Empty filters = show all devices
    });

    await usbDevice.open();

    // Select configuration
    if (usbDevice.configuration === null) {
        await usbDevice.selectConfiguration(1);
    }

    // Find the correct interface and endpoint for printing
    const iface = usbDevice.configuration?.interfaces[0];
    if (!iface) {
        throw new Error('ไม่พบ interface ของเครื่องพิมพ์');
    }

    await usbDevice.claimInterface(iface.interfaceNumber);

    // Find OUT endpoint (for sending data to printer)
    const alternate = iface.alternate;
    const outEndpoint = alternate.endpoints.find(ep => ep.direction === 'out');
    if (outEndpoint) {
        usbEndpoint = outEndpoint.endpointNumber;
    }

    connectionType = 'usb';
    console.log('✅ Connected via WebUSB');
}

/**
 * Connect via Web Serial
 */
async function connectSerial(): Promise<void> {
    serialPort = await navigator.serial.requestPort();

    await serialPort.open({
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
    });

    if (serialPort.writable) {
        serialWriter = serialPort.writable.getWriter();
    }

    connectionType = 'serial';
    console.log('✅ Connected via Web Serial');
}

/**
 * Disconnect from printer
 */
export async function disconnectPrinter(): Promise<void> {
    try {
        if (connectionType === 'usb' && usbDevice) {
            await usbDevice.close();
            usbDevice = null;
        } else if (connectionType === 'serial') {
            if (serialWriter) {
                await serialWriter.releaseLock();
                serialWriter = null;
            }
            if (serialPort) {
                await serialPort.close();
                serialPort = null;
            }
        }
        connectionType = null;
        console.log('🔌 Printer disconnected');
    } catch (error) {
        console.error('Error disconnecting:', error);
        connectionType = null;
        usbDevice = null;
        serialWriter = null;
        serialPort = null;
    }
}

/**
 * Send command to printer
 */
export async function sendCommand(command: Uint8Array): Promise<void> {
    if (!isPrinterConnected()) {
        throw new Error('ไม่ได้เชื่อมต่อเครื่องพิมพ์');
    }

    if (connectionType === 'usb' && usbDevice) {
        await usbDevice.transferOut(usbEndpoint, command.buffer as ArrayBuffer);
    } else if (connectionType === 'serial' && serialWriter) {
        await serialWriter.write(command);
    }
}

/**
 * Open cash drawer
 */
export async function openCashDrawer(): Promise<void> {
    if (!isPrinterConnected()) {
        throw new Error('กรุณาเชื่อมต่อเครื่องพิมพ์ก่อน');
    }

    try {
        await sendCommand(ESC_POS.OPEN_DRAWER_PIN2);
        console.log('✅ Cash drawer opened (Pin 2)');
    } catch (error) {
        // Try Pin 5 as fallback
        await sendCommand(ESC_POS.OPEN_DRAWER_PIN5);
        console.log('✅ Cash drawer opened (Pin 5)');
    }
}

/**
 * Send text to printer
 */
export async function sendText(text: string): Promise<void> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    await sendCommand(data);
}

/**
 * Print and cut
 */
export async function printAndCut(text: string): Promise<void> {
    await sendCommand(ESC_POS.INIT);
    await sendText(text);
    await sendCommand(ESC_POS.LINE_FEED);
    await sendCommand(ESC_POS.LINE_FEED);
    await sendCommand(ESC_POS.LINE_FEED);
    await sendCommand(ESC_POS.CUT_PAPER);
}

