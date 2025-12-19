/**
 * LINE Official Account Integration
 * 
 * Setup required:
 * 1. Create LINE Official Account at https://manager.line.biz/
 * 2. Enable Messaging API
 * 3. Get Channel Access Token and Channel Secret
 * 4. Add to .env.local:
 *    LINE_CHANNEL_ACCESS_TOKEN=xxx
 *    LINE_CHANNEL_SECRET=xxx
 */

const LINE_API_BASE = 'https://api.line.me/v2/bot';

interface LineMessagePayload {
    to: string;  // LINE User ID
    messages: LineMessage[];
}

interface LineMessage {
    type: 'text' | 'flex';
    text?: string;
    altText?: string;
    contents?: any;
}

/**
 * Send message to LINE user
 */
export async function sendLineMessage(userId: string, message: string): Promise<boolean> {
    const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!channelToken) {
        console.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
        return false;
    }

    try {
        const response = await fetch(`${LINE_API_BASE}/message/push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${channelToken}`
            },
            body: JSON.stringify({
                to: userId,
                messages: [{ type: 'text', text: message }]
            } as LineMessagePayload)
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('LINE API Error:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Failed to send LINE message:', error);
        return false;
    }
}

/**
 * Send purchase notification to customer
 */
export async function sendPurchaseNotification(
    lineUserId: string,
    receiptNo: string,
    totalAmount: number,
    pointsEarned: number,
    currentPoints: number
): Promise<boolean> {
    const message = `🧾 ขอบคุณที่ใช้บริการ

เลขที่บิล: ${receiptNo}
ยอดชำระ: ฿${totalAmount.toLocaleString()}
แต้มที่ได้รับ: +${pointsEarned} แต้ม
แต้มสะสมรวม: ${currentPoints} แต้ม

ร้านกิจเจริญเคมีการเกษตร 🌿`;

    return sendLineMessage(lineUserId, message);
}

/**
 * Send low stock alert to admin
 */
export async function sendLowStockAlert(
    adminLineUserId: string,
    productName: string,
    currentStock: number,
    minLevel: number
): Promise<boolean> {
    const message = `⚠️ สินค้าใกล้หมด!

📦 ${productName}
คงเหลือ: ${currentStock} (ตั้งไว้: ${minLevel})

กรุณาสั่งซื้อเพิ่ม`;

    return sendLineMessage(adminLineUserId, message);
}

/**
 * Verify LINE webhook signature
 */
export function verifyLineSignature(
    body: string,
    signature: string
): boolean {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto') as typeof import('crypto');
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    if (!channelSecret) return false;

    const hash = crypto
        .createHmac('sha256', channelSecret)
        .update(body)
        .digest('base64');

    return hash === signature;
}
