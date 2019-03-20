// Hash lookup table as defined by Ken Perlin.  This is a randomly
// arranged array of all numbers from 0-255 inclusive.
const PERMUTATION = new Uint8Array([151, 160, 137, 91, 90, 15,
    131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
    190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
    88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166,
    77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
    102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
    135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
    5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
    223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
    129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
    251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
    49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
    138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
]);

const P = new Uint8Array(512);
for (let i = 0; i < 512; i++) {
    P[i] = PERMUTATION[i % 256];
}

function lerp(a, b, x) {
    return a + x * (b - a);
}

function fade(t) {
    // Fade function as defined by Ken Perlin.  This eases coordinate values
    // so that they will "ease" towards integral values.  This ends up smoothing
    // the final output.
    return t * t * t * (t * (t * 6 - 15) + 10);			// 6t^5 - 15t^4 + 10t^3
}

function grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;

    let v;
    if (h < 4) {
        v = y;
    } else if (h == 12 || h == 14) {
        v = x;
    } else {
        v = z;
    }

    return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
}

let repeat = -1;

export function setRepeat(r) {
    repeat = r;
}

export function inc(num) {
    num++;
    if (repeat > 0) num %= repeat;

    return num;
}

export function generate(x, y, z) {
    if (repeat > 0) {
        x = x % repeat;
        y = y % repeat;
        z = z % repeat;
    }

    const xi = Math.floor(x) & 255;   // Calculate the "unit cube" that the point asked will be located in
    const yi = Math.floor(y) & 255;   // The left bound is ( |_x_|,|_y_|,|_z_| ) and the right bound is that
    const zi = Math.floor(z) & 255;   // plus 1.  Next we calculate the location (from 0.0 to 1.0) in that cube.

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);

    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);
    
    const aaa = P[P[P[xi] + yi] + zi];
    const aba = P[P[P[xi] + inc(yi)] + zi];
    const aab = P[P[P[xi] + yi] + inc(zi)];
    const abb = P[P[P[xi] + inc(yi)] + inc(zi)];
    const baa = P[P[P[inc(xi)] + yi] + zi];
    const bba = P[P[P[inc(xi)] + inc(yi)] + zi];
    const bab = P[P[P[inc(xi)] + yi] + inc(zi)];
    const bbb = P[P[P[inc(xi)] + inc(yi)] + inc(zi)];

    let x1 = lerp(grad(aaa, xf, yf, zf), grad(baa, xf - 1, yf, zf), u);
    let x2 = lerp(grad(aba, xf, yf - 1, zf), grad(bba, xf - 1, yf - 1, zf), u);
    const  y1 = lerp(x1, x2, v);

    x1 = lerp(grad(aab, xf, yf, zf - 1), grad(bab, xf - 1, yf, zf - 1), u);
    x2 = lerp(grad(abb, xf, yf - 1, zf - 1), grad(bbb, xf - 1, yf - 1, zf - 1), u);
    const y2 = lerp(x1, x2, v);

    return (lerp(y1, y2, w) + 1) / 2;
}

export function generateOctave(x, y, z, octaves, persistence) {

    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
        total += generate(x * frequency, y * frequency, z * frequency) * amplitude;

        maxValue += amplitude;

        amplitude *= persistence;
        frequency *= 2;
    }

    return total / maxValue;
}

export default generateOctave;