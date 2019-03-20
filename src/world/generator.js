import { hexToRGBNormalized, IS_LITTLE_ENDIAN } from '../core/utilities.js';
import generateOctave from './noise.js';

const MATERIAL_NUMBER_OF_COMPONENTS = 8; // needs to be a factor of 4.
const MATERIALS = [
    {
        albedo: [0.0, 0.0, 0.0],
        fuzz: 0.0,
        refractiveIndex: 0.0,
        type: 0
    },
    {
        albedo: hexToRGBNormalized(0x71aa34),
        fuzz: 0.0,
        refractiveIndex: 0.0,
        type: 0
    },
    {
        albedo: hexToRGBNormalized(0xa05b53),
        fuzz: 0.0,
        refractiveIndex: 0.0,
        type: 0
    },
    {
        albedo: hexToRGBNormalized(0x7d7071),
        fuzz: 0.1,
        refractiveIndex: 0.0,
        type: 1
    }
];

export const NUMBER_OF_MATERIALS = MATERIALS.length;
export const MATERIAL_ARRAY_BUFFER = new ArrayBuffer((NUMBER_OF_MATERIALS * MATERIAL_NUMBER_OF_COMPONENTS) * 8);

const MATERIAL_ARRAY_BUFFER_VIEW = new DataView(MATERIAL_ARRAY_BUFFER);
for (let i = 0; i < NUMBER_OF_MATERIALS; i++) {

    const { albedo, fuzz, refractiveIndex, type } = MATERIALS[i];

    // PACKING:
    // albedo: vec3
    // fuzz: f32
    // refractive_index: f32
    // type: int

    const offset = i * MATERIAL_NUMBER_OF_COMPONENTS;

    MATERIAL_ARRAY_BUFFER_VIEW.setFloat32((offset + 0) * 4, albedo[0], IS_LITTLE_ENDIAN);
    MATERIAL_ARRAY_BUFFER_VIEW.setFloat32((offset + 1) * 4, albedo[1], IS_LITTLE_ENDIAN);
    MATERIAL_ARRAY_BUFFER_VIEW.setFloat32((offset + 2) * 4, albedo[2], IS_LITTLE_ENDIAN);

    MATERIAL_ARRAY_BUFFER_VIEW.setFloat32((offset + 3) * 4, fuzz, IS_LITTLE_ENDIAN);
    MATERIAL_ARRAY_BUFFER_VIEW.setFloat32((offset + 4) * 4, refractiveIndex, IS_LITTLE_ENDIAN);
    MATERIAL_ARRAY_BUFFER_VIEW.setInt32((offset + 5) * 4, type, IS_LITTLE_ENDIAN);

}

export function generate(size) {

    let voxels = new Uint8Array(size * size * size);

    for (let k = 0; k < size; k++) {
        for (let j = size; j >= 0; j--) {
            for (let i = 0; i < size; i++) {
    
                const value = generateOctave(i / size, j / size, k / size, 3, 4);
    
                const att = 1.0 - (j / size);
                let material_id = 1 + (Math.floor(value * (NUMBER_OF_MATERIALS)));
    
                if (voxels[i + (j + 1) * size + k * size * size] === 0) {
                    material_id = 1;
                }
    
                voxels[i + j * size + k * size * size] = (value > att) ? 0 : material_id;

            }
        }
    }

    console.log('Generated voxels.');
    console.log('Number of voxels (excepting air): ' + voxels.reduce((acc, value) => {
        return acc + ((value > 0) ? 1 : 0);
    }, 0));

    return voxels;
}

