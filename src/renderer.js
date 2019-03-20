import { NUMBER_OF_MATERIALS, MATERIAL_ARRAY_BUFFER, generate } from './world/generator.js';

import PathTracingShader from './shaders/pathtracing/index.js';
import NormalShader from './shaders/normal/index.js';
import DisplayShader from './shaders/display/index.js';

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
            MAXIMUM_TRAVERSAL_DISTANCE: MAXIMUM_TRAVERSAL_DISTANCE + 'u',
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
            MAXIMUM_TRAVERSAL_DISTANCE: MAXIMUM_TRAVERSAL_DISTANCE + 'u',
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

        // setTimeout(() => {
        //     var data = new Uint8Array(domElement.width * domElement.height * 4);

        //     gl.bindFramebuffer(gl.FRAMEBUFFER, targetFrameBuffer);
        //     gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, normalTexture, 0);
        //     gl.readBuffer(gl.COLOR_ATTACHMENT0);
        //     gl.readPixels(0, 0, domElement.width, domElement.height, gl.RED_INTEGER, gl.UNSIGNED_BYTE, data);

        //     console.log(data);
        //     const [max, min] = data.reduce(([max, min], val) => [Math.max(max, val), Math.min(min, val)], [-Infinity, Infinity]);
        //     console.log('Max: ' + max);
        //     console.log('Min: ' + min);

        //     const sum = data.reduce((sum, val) => sum + val, 0);
        //     console.log('Sum: ' + sum);
        // }, 2000);

        /**
         * DISPLAY PHASE SETUP:
         */
        let displayShader = DisplayShader.new(gl, {
            ENABLE_FILTER: enableFilter
        });


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
            },

            setParams({ numberOfSamples = 6, maximumDepth = 8, enableFilter = true } = {}) {
                displayShader = DisplayShader.new(gl, {
                    ENABLE_FILTER: enableFilter
                });

                pathTracingShader = PathTracingShader.new(gl, {
                    NUMBER_OF_MATERIALS,
                    VOXEL_SIZE: VOXEL_SIZE + '.0',
                    MAXIMUM_TRAVERSAL_DISTANCE: MAXIMUM_TRAVERSAL_DISTANCE + 'u',
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

                gl.uniform2f(pathTracingShader.uniformLocations.screenDimensions, domElement.width, domElement.height);
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
                 * Display phase:
                 */
                gl.useProgram(displayShader.program);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, pathTracingTexture);
                gl.uniform1i(displayShader.uniformLocations.tracePass, 0);

                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, materialNormalTexture);
                gl.uniform1i(displayShader.uniformLocations.normalPassMaterialNormalSampler, 1);

                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, planeTexture);
                gl.uniform1i(displayShader.uniformLocations.normalPassPlaneSampler, 2);

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
        };

        return renderer;
    }
}