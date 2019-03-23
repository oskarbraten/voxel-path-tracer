
export function hexToRGBNormalized(hex) {
    const r = (hex >> 16) / 255;
    const g = (hex >> 8 & 0xFF) / 255;
    const b = (hex & 0xFF) / 255;
    return [r, g, b];
}

export function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

export const IS_LITTLE_ENDIAN = new Uint8Array(new Uint32Array([0x12345678]).buffer)[0] === 0x78;