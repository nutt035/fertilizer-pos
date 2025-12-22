'use client';

import React from 'react';
import Barcode from 'react-barcode';

export default function BarcodeGenerator({
    value,
    format = 'CODE128'
}: {
    value: string;
    format?: 'CODE128' | 'EAN13';
}) {
    // NOTE:
    // - CODE128: ใช้ได้กับเลข/ตัวอักษร เหมาะกับ "บาร์โค้ดร้าน"
    // - EAN13: ต้องเป็นเลข 13 หลักเท่านั้น (ถ้าคุณ generate EAN-13 ก็ใช้ได้)
    return (
        <div className="w-full flex justify-center">
            <Barcode
                value={value}
                format={format}
                displayValue={true}
                height={60}
                width={2}
                margin={0}
            />
        </div>
    );
}
