import { NUMBER_OF_MATERIALS, MATERIAL_ARRAY_BUFFER, generate } from './world/generator.js';

import PathTracingShader from './shaders/pathtracing/index.js';
import NormalShader from './shaders/normal/index.js';
import FilterShader from './shaders/filter/index.js';

const VOXEL_SIZE = 1.0;
const MAXIMUM_TRAVERSAL_DISTANCE = 128;

export default {
    new(context = null, { numberOfSamples = 6, maximumDepth = 8, enableFilter = true } = {}) {

        if (context === null) {
            throw Error('You must pass a WebGL2 context to the renderer.');
        }

        const gl = context;
        const domElement = gl.canvas;

        gl.viewport(0, 0, domElement.width, domElement.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);

        /**
         * Upload fullscreen quad:
        */

        const dataBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, dataBuffer);

        const data = new Float32Array([
            // set #1:
            -1.0, 1.0,
            -1.0, -1.0,
            1.0, 1.0,
            1.0, -1.0,

            // set #2:
            0.0, 1.0,
            0.0, 0.0,
            1.0, 1.0,
            1.0, 0.0
        ]);

        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

        // set #1:
        gl.vertexAttribPointer(0, 2, gl.FLOAT, 0, 0, 0);
        gl.enableVertexAttribArray(0);

        // set #2:
        gl.vertexAttribPointer(1, 2, gl.FLOAT, 0, 0, 8 * 4); // 8 components * 4 bytes = 32 bytes
        gl.enableVertexAttribArray(1);


        /**
         * Framebuffer for offscreen rendering:
         */
        const targetFrameBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, targetFrameBuffer);

        /**
         * PATH TRACING PHASE SETUP:
         */

        let pathTracingShader = PathTracingShader.new(gl, {
            NUMBER_OF_MATERIALS,
            VOXEL_SIZE: VOXEL_SIZE + '.0',
            MAXIMUM_TRAVERSAL_DISTANCE,
            NUMBER_OF_SAMPLES: numberOfSamples,
            MAXIMUM_DEPTH: maximumDepth
        });

        gl.useProgram(pathTracingShader.program);

        // set up render target texture:
        const pathTracingTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, pathTracingTexture);

        // initialize texture:
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, domElement.width, domElement.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

        /**
         * NORMAL PHASE SETUP:
         */
        let normalShader = NormalShader.new(gl, {
            MAXIMUM_TRAVERSAL_DISTANCE,
            VOXEL_SIZE: VOXEL_SIZE + '.0'
        });

        gl.useProgram(normalShader.program);

        // set up render target texture for material-id and normal-id:
        const materialNormalTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, materialNormalTexture);

        // initialize texture:
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8UI, domElement.width, domElement.height, 0, gl.RG_INTEGER, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

        // set up render target texture for plane-id
        const planeTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, planeTexture);

        // initialize texture:
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32I, domElement.width, domElement.height, 0, gl.RED_INTEGER, gl.INT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

        /**
         * FILTER PHASE SETUP:
         */
        let filterShader = FilterShader.new(gl, {
            ENABLE_FILTER: enableFilter
        });

        // set up render target texture for first filter pass.
        const filterTargetTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, filterTargetTexture);

        // initialize texture:
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, domElement.width, domElement.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);


        /**
         * MATERIALS and VOXELS:
         */

        gl.useProgram(pathTracingShader.program);

        const materialBuffer = gl.createBuffer();
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, materialBuffer);
        gl.bufferData(gl.UNIFORM_BUFFER, MATERIAL_ARRAY_BUFFER, gl.DYNAMIC_DRAW);
        gl.uniformBlockBinding(pathTracingShader.program, gl.getUniformBlockIndex(pathTracingShader.program, 'Materials'), 0);

        const voxelTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_3D, voxelTexture);

        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

        const size = 64;
        const voxels = generate(size);

        gl.texImage3D(
            gl.TEXTURE_3D,              // target
            0,                          // level
            gl.R8UI,                    // internalformat
            size,                       // width
            size,                       // height
            size,                       // depth
            0,                          // border
            gl.RED_INTEGER,             // format
            gl.UNSIGNED_BYTE,           // type
            voxels                      // pixel
        );

        let totalTime = 0;
        const renderer = {

            domElement,
            gl,

            setSize(width, height) {
                domElement.width = width;
                domElement.height = height;
                gl.viewport(0, 0, domElement.width, domElement.height);
                gl.clearColor(1.0, 1.0, 1.0, 1.0);

                // update target texture sizes:
                gl.bindTexture(gl.TEXTURE_2D, pathTracingTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, domElement.width, domElement.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

                gl.bindTexture(gl.TEXTURE_2D, materialNormalTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8UI, domElement.width, domElement.height, 0, gl.RG_INTEGER, gl.UNSIGNED_BYTE, null);

                gl.bindTexture(gl.TEXTURE_2D, planeTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32I, domElement.width, domElement.height, 0, gl.RED_INTEGER, gl.INT, null);

                gl.bindTexture(gl.TEXTURE_2D, filterTargetTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, domElement.width, domElement.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            },

            setParams({ numberOfSamples = 6, maximumDepth = 8, enableFilter = true } = {}) {
                filterShader = FilterShader.new(gl, {
                    ENABLE_FILTER: enableFilter
                });

                pathTracingShader = PathTracingShader.new(gl, {
                    NUMBER_OF_MATERIALS,
                    VOXEL_SIZE: VOXEL_SIZE + '.0',
                    MAXIMUM_TRAVERSAL_DISTANCE,
                    NUMBER_OF_SAMPLES: numberOfSamples,
                    MAXIMUM_DEPTH: maximumDepth
                });
            },

            draw(delta, camera) {

                totalTime += delta;

                /**
                 * Path tracing phase:
                 */
                gl.useProgram(pathTracingShader.program);
                gl.bindFramebuffer(gl.FRAMEBUFFER, targetFrameBuffer);

                gl.uniform2f(pathTracingShader.uniformLocations.resolution, domElement.width, domElement.height);
                gl.uniform1f(pathTracingShader.uniformLocations.seed, Math.random());
                gl.uniform1f(pathTracingShader.uniformLocations.deltaTime, delta);
                gl.uniform1f(pathTracingShader.uniformLocations.totalTime, totalTime);

                gl.uniformMatrix4fv(pathTracingShader.uniformLocations.cameraMatrix, false, camera.node.worldMatrix);
                gl.uniform1f(pathTracingShader.uniformLocations.cameraFov, camera.yfov);
                gl.uniform1f(pathTracingShader.uniformLocations.cameraAspectRatio, camera.aspectRatio);

                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pathTracingTexture, 0);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

                /**
                 * Normals phase:
                 */
                gl.useProgram(normalShader.program);
                gl.bindFramebuffer(gl.FRAMEBUFFER, targetFrameBuffer);

                gl.uniformMatrix4fv(normalShader.uniformLocations.cameraMatrix, false, camera.node.worldMatrix);
                gl.uniform1f(normalShader.uniformLocations.cameraFov, camera.yfov);
                gl.uniform1f(normalShader.uniformLocations.cameraAspectRatio, camera.aspectRatio);

                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, materialNormalTexture, 0);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, planeTexture, 0);

                gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

                /**
                 * Filter phase:
                 */

                

                /**
                 * Filter phase:
                 */
                gl.useProgram(filterShader.program);
 
                gl.uniform2f(filterShader.uniformLocations.direction, 0.0, 1.0);
                gl.uniform2f(filterShader.uniformLocations.resolution, domElement.width, domElement.height);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, pathTracingTexture);
                gl.uniform1i(filterShader.uniformLocations.inputSampler, 0);

                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, materialNormalTexture);
                gl.uniform1i(filterShader.uniformLocations.mnSampler, 1);

                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, planeTexture);
                gl.uniform1i(filterShader.uniformLocations.pSampler, 2);

                /**
                 * First pass:
                 */
                // gl.bindFramebuffer(gl.FRAMEBUFFER, targetFrameBuffer);
                // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, filterTargetTexture, 0);

                // gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.NONE]);

                // gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

                /**
                 * Final pass:
                 */
                gl.uniform2f(filterShader.uniformLocations.direction, 1.0, 0.0);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
        };

        return renderer;
    }
}