import { vec3, mat4 } from '../lib/gl-matrix/index.js';
import Shader from './shader.js';

import utilities from './core/utilities.js';

const perlin = utilities.new_perlin();

const IS_LITTLE_ENDIAN = new Uint8Array(new Uint32Array([0x12345678]).buffer)[0] === 0x78;

const VOXEL_SIZE = 1.0;
const VOXEL_CHUNK_SIZE = 64;
const NUMBER_OF_MATERIALS = 4;
const MAXIMUM_TRAVERSAL_DISTANCE = 128;

export default {
    new(context = null, { numberOfSamples = 6, maximumDepth = 8 } = {}) {

        if (context === null) {
            throw Error('You must pass a WebGL2 context to the renderer.');
        }

        const gl = context;
        const domElement = gl.canvas;

        gl.viewport(0, 0, domElement.width, domElement.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);

        let shader = Shader.new(gl, {
            NUMBER_OF_MATERIALS,
            VOXEL_SIZE: VOXEL_SIZE + '.0',
            VOXEL_CHUNK_SIZE,
            MAXIMUM_TRAVERSAL_DISTANCE: MAXIMUM_TRAVERSAL_DISTANCE + 'u',
            NUMBER_OF_SAMPLES: numberOfSamples,
            MAXIMUM_DEPTH: maximumDepth
        });

        gl.useProgram(shader.program);

        let totalTime = 0;

        // UBO:
        const worldBuffer = gl.createBuffer();
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, worldBuffer);

        const MATERIAL_NUMBER_OF_COMPONENTS = 8; // needs to be a factor of 4.

        const materialBuffer = new ArrayBuffer((NUMBER_OF_MATERIALS * MATERIAL_NUMBER_OF_COMPONENTS) * 8);
        const materialBufferView = new DataView(materialBuffer);

        let materials = [
            {
                albedo: vec3.fromValues(0.0, 0.0, 0.0),
                fuzz: 0.0,
                refractiveIndex: 0.0,
                type: 0
            },
            {
                albedo: vec3.fromValues(...utilities.hexToRGBNormalized(0x71aa34)),
                fuzz: 0.0,
                refractiveIndex: 0.0,
                type: 0
            },
            {
                albedo: vec3.fromValues(...utilities.hexToRGBNormalized(0xa05b53)),
                fuzz: 0.0,
                refractiveIndex: 0.0,
                type: 0
            },
            {
                albedo: vec3.fromValues(...utilities.hexToRGBNormalized(0x7d7071)),
                fuzz: 0.0,
                refractiveIndex: 0.0,
                type: 0
            }
        ];

        for (let i = 0; i < NUMBER_OF_MATERIALS; i++) {

            const { albedo, fuzz, refractiveIndex, type } = materials[i];

            // PACKING:
            // albedo: vec3
            // fuzz: f32
            // refractive_index: f32
            // type: int

            const offset = i * MATERIAL_NUMBER_OF_COMPONENTS;

            materialBufferView.setFloat32((offset + 0) * 4, albedo[0], IS_LITTLE_ENDIAN);
            materialBufferView.setFloat32((offset + 1) * 4, albedo[1], IS_LITTLE_ENDIAN);
            materialBufferView.setFloat32((offset + 2) * 4, albedo[2], IS_LITTLE_ENDIAN);

            materialBufferView.setFloat32((offset + 3) * 4, fuzz, IS_LITTLE_ENDIAN);
            materialBufferView.setFloat32((offset + 4) * 4, refractiveIndex, IS_LITTLE_ENDIAN);
            materialBufferView.setInt32((offset + 5) * 4, type, IS_LITTLE_ENDIAN);

        }

        // fill buffer on GPU.
        gl.bufferData(gl.UNIFORM_BUFFER, materialBuffer, gl.DYNAMIC_DRAW);

        // bind block:
        gl.uniformBlockBinding(shader.program, gl.getUniformBlockIndex(shader.program, 'Materials'), 0);

        let voxels = new Uint8Array(VOXEL_CHUNK_SIZE * VOXEL_CHUNK_SIZE * VOXEL_CHUNK_SIZE);
        for (let k = 0; k < VOXEL_CHUNK_SIZE; k++) {
            for (let j = VOXEL_CHUNK_SIZE; j >= 0; j--) {
                for (let i = 0; i < VOXEL_CHUNK_SIZE; i++) {

                    const value = perlin.generateOctave(i / VOXEL_CHUNK_SIZE, j / VOXEL_CHUNK_SIZE, k / VOXEL_CHUNK_SIZE, 3, 4);

                    const att = 1.0 - (j / VOXEL_CHUNK_SIZE);
                    let material_id = 1 + (Math.floor(value * (NUMBER_OF_MATERIALS)));

                    if (voxels[i + (j + 1) * VOXEL_CHUNK_SIZE + k * VOXEL_CHUNK_SIZE * VOXEL_CHUNK_SIZE] === 0) {
                        material_id = 1;
                    }

                    voxels[i + j * VOXEL_CHUNK_SIZE + k * VOXEL_CHUNK_SIZE * VOXEL_CHUNK_SIZE] = (value > att) ? 0 : material_id;
                }
            }
        }

        console.log(voxels);
        console.log('Number of voxels (excepting air): ' + voxels.reduce((acc, value) => {
            return acc + ((value > 0) ? 1 : 0);
        }, 0));

        const voxelTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_3D, voxelTexture);

        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

        gl.texImage3D(
            gl.TEXTURE_3D,              // target
            0,                          // level
            gl.R8UI,                    // internalformat
            VOXEL_CHUNK_SIZE,           // width
            VOXEL_CHUNK_SIZE,           // height
            VOXEL_CHUNK_SIZE,           // depth
            0,                          // border
            gl.RED_INTEGER,             // format
            gl.UNSIGNED_BYTE,           // type
            voxels                      // pixel
        );

        // set up render targets:

        // const target1 = gl.createTexture();
        // gl.bindTexture(gl.TEXTURE_2D, target1);
        // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, domElement.width, domElement.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        // const target2 = gl.createTexture();
        // gl.bindTexture(gl.TEXTURE_2D, target2);
        // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, domElement.width, domElement.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        // const frameBuffer = gl.createFramebuffer();
        // gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
        // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target1, 0);

        const renderer = {

            domElement,
            gl,

            setSize(width, height) {
                domElement.width = width;
                domElement.height = height;
                gl.viewport(0, 0, domElement.width, domElement.height);
                gl.clearColor(1.0, 1.0, 1.0, 1.0);
            },

            setParams({ numberOfSamples = 6, maximumDepth = 8 } = {}) {
                shader = Shader.new(gl, {
                    NUMBER_OF_MATERIALS,
                    VOXEL_SIZE: VOXEL_SIZE + '.0',
                    VOXEL_CHUNK_SIZE,
                    MAXIMUM_TRAVERSAL_DISTANCE: MAXIMUM_TRAVERSAL_DISTANCE + 'u',
                    NUMBER_OF_SAMPLES: numberOfSamples,
                    MAXIMUM_DEPTH: maximumDepth
                });

                gl.useProgram(shader.program);
            },

            draw(delta, camera) {

                totalTime += delta;

                gl.uniform2f(shader.uniformLocations.screenDimensions, domElement.width, domElement.height);
                gl.uniform1f(shader.uniformLocations.seed, Math.random());
                gl.uniform1f(shader.uniformLocations.deltaTime, delta);
                gl.uniform1f(shader.uniformLocations.totalTime, totalTime);

                const viewMatrix = mat4.invert(mat4.create(), camera.node.worldMatrix);
                gl.uniformMatrix4fv(shader.uniformLocations.viewMatrix, false, viewMatrix);
                gl.uniformMatrix4fv(shader.uniformLocations.cameraMatrix, false, camera.node.worldMatrix);

                gl.uniform1f(shader.uniformLocations.cameraFov, camera.yfov);
                gl.uniform1f(shader.uniformLocations.cameraAspectRatio, camera.aspectRatio);

                // draw fullscreen quad:
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
        };

        return renderer;
    }
}