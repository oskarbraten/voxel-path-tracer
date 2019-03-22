import PathTracingPass from './shaders/pathtracing/index.js';
import FinalPass from './shaders/final/index.js';

const VOXEL_SIZE = 1.0;
const MAXIMUM_TRAVERSAL_DISTANCE = 128;

export default class Renderer {
    constructor(context = null, { numberOfSamples = 6, maximumDepth = 8 } = {}) {

        if (context === null) {
            throw Error('You must pass a WebGL2 context to the renderer.');
        }

        this.context = context;

        const gl = this.context;

        gl.viewport(0, 0, context.canvas.width, context.canvas.height);
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
        this.targetFrameBuffer = gl.createFramebuffer();

        /**
         * PATH TRACING PHASE SETUP:
         */

        let pathTracingPass = new PathTracingPass(gl, context.canvas.width, context.canvas.height, {
            VOXEL_SIZE: VOXEL_SIZE + '.0',
            MAXIMUM_TRAVERSAL_DISTANCE,
            NUMBER_OF_SAMPLES: numberOfSamples,
            MAXIMUM_DEPTH: maximumDepth
        });

        this.pathTracingPass = pathTracingPass;

        /**
         * FINAL PHASE SETUP:
         */

        this.finalPass = new FinalPass(gl);
    }

    setSize(width, height) {

        const gl = this.context;

        this.context.canvas.width = width;
        this.context.canvas.height = height;
        gl.viewport(0, 0, this.context.canvas.width, this.context.canvas.height);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);

        this.pathTracingPass.setSize(width, height);

    }

    setParams({ numberOfSamples = 6, maximumDepth = 8} = {}) {
        this.pathTracingPass.rebuild({
            VOXEL_SIZE: VOXEL_SIZE + '.0',
            MAXIMUM_TRAVERSAL_DISTANCE,
            NUMBER_OF_SAMPLES: numberOfSamples,
            MAXIMUM_DEPTH: maximumDepth
        });
    }

    draw(delta, camera) {

        this.pathTracingPass.draw(this.targetFrameBuffer, {
            resolution: [this.context.canvas.width, this.context.canvas.height],
            cameraMatrix: camera.node.worldMatrix,
            cameraFov: camera.yfov,
            cameraAspectRatio: camera.aspectRatio
        });

        const finalFrame = this.pathTracingPass.targets[this.pathTracingPass.previousFrame];
        this.finalPass.draw(finalFrame);

        // /**
        //  * Normals phase:
        //  */
        // gl.useProgram(normalShader.program);
        // gl.bindFramebuffer(gl.FRAMEBUFFER, targetFrameBuffer);

        // gl.uniformMatrix4fv(normalShader.uniformLocations.cameraMatrix, false, camera.node.worldMatrix);
        // gl.uniform1f(normalShader.uniformLocations.cameraFov, camera.yfov);
        // gl.uniform1f(normalShader.uniformLocations.cameraAspectRatio, camera.aspectRatio);

        // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, materialNormalTexture, 0);
        // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, planeTexture, 0);

        // gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

        // gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // // unbind attachment 1 to avoid drawing to it.
        // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, null, 0);

        // /**
        //  * Filter phase:
        //  */
        // gl.useProgram(filterShader.program);

        // gl.uniform2f(filterShader.uniformLocations.direction, 0.0, 1.0);
        // gl.uniform2f(filterShader.uniformLocations.resolution, this.domElement.width, this.domElement.height);

        // gl.activeTexture(gl.TEXTURE0);
        // gl.bindTexture(gl.TEXTURE_2D, pathTracingTexture);
        // gl.uniform1i(filterShader.uniformLocations.inputSampler, 0);

        // gl.activeTexture(gl.TEXTURE1);
        // gl.bindTexture(gl.TEXTURE_2D, materialNormalTexture);
        // gl.uniform1i(filterShader.uniformLocations.mnSampler, 1);

        // gl.activeTexture(gl.TEXTURE2);
        // gl.bindTexture(gl.TEXTURE_2D, planeTexture);
        // gl.uniform1i(filterShader.uniformLocations.pSampler, 2);

        // /**
        //  * First pass:
        //  */

        // gl.bindFramebuffer(gl.FRAMEBUFFER, targetFrameBuffer);
        // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, filterTarget1Texture, 0);

        // gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.NONE]);

        // gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // /**
        //  * Multiple passes:
        //  */

        // const targets = [
        //     filterTarget1Texture,
        //     filterTarget2Texture
        // ];

        // const dir = [
        //     [0.0, 1.0],
        //     [1.0, 0.0]
        // ];

        // let currentTarget = 1;

        // for (let i = 0; i < numberOfFilterPasses; i++) {

        //     const previousTarget = (currentTarget + 1) % 2;

        //     gl.activeTexture(gl.TEXTURE0);
        //     gl.bindTexture(gl.TEXTURE_2D, targets[previousTarget]);
        //     gl.uniform1i(filterShader.uniformLocations.inputSampler, 0);

        //     gl.uniform2f(filterShader.uniformLocations.direction, ...dir[currentTarget]);

        //     gl.bindFramebuffer(gl.FRAMEBUFFER, targetFrameBuffer);
        //     gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targets[currentTarget], 0);

        //     gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.NONE]);

        //     gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        //     currentTarget = previousTarget;

        // }

        // /**
        //  * Final pass:
        //  */
        // gl.activeTexture(gl.TEXTURE0);
        // gl.bindTexture(gl.TEXTURE_2D, targets[currentTarget]);
        // gl.uniform1i(filterShader.uniformLocations.inputSampler, 0);

        // gl.uniform2f(filterShader.uniformLocations.direction, 1.0, 0.0);
        // gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}