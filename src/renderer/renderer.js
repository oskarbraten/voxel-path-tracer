import PathTracingPass from './shaders/pathtracing/index.js';
import FinalPass from './shaders/final/index.js';
import FilteringPass from './shaders/filtering/index.js';

const VOXEL_SIZE = 1.0;
const MAXIMUM_TRAVERSAL_DISTANCE = 128;

export default class Renderer {
    constructor(context = null, { maximumDepth = 8 } = {}) {

        if (context === null) {
            throw Error('You must pass a WebGL2 context to the renderer.');
        }

        this.context = context;
        const gl = this.context;

        // console.log(gl.getSupportedExtensions());
        // this.context.getExtension('EXT_color_buffer_float');

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
            -1.0, -1.0,
            3.0, -1.0,
            -1.0, 3.0,

            // set #2:
            0.0, 0.0,
            2.0, 0.0,
            0.0, 2.0,
        ]);

        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

        // set #1:
        gl.vertexAttribPointer(0, 2, gl.FLOAT, 0, 0, 0);
        gl.enableVertexAttribArray(0);

        // set #2:
        gl.vertexAttribPointer(1, 2, gl.FLOAT, 0, 0, 6 * 4); // 8 components * 4 bytes = 32 bytes
        gl.enableVertexAttribArray(1);


        /**
         * Framebuffer for offscreen rendering:
         */
        this.targetFrameBuffer = gl.createFramebuffer();

        /**
         * PATH TRACING PHASE SETUP:
         */

        let pathTracingPass = new PathTracingPass(gl, context.canvas.width, context.canvas.height, {
            VOXEL_SIZE: VOXEL_SIZE.toFixed(2),
            MAXIMUM_TRAVERSAL_DISTANCE,
            MAXIMUM_DEPTH: maximumDepth
        });

        this.pathTracingPass = pathTracingPass;

        /**
         * FILTERING PHASE SETUP:
         */

        this.filteringPass = new FilteringPass(gl, context.canvas.width, context.canvas.height);

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
        this.filteringPass.setSize(width, height);

    }

    setParams({ maximumDepth = 8} = {}) {
        this.pathTracingPass.rebuild({
            VOXEL_SIZE: VOXEL_SIZE + '.0',
            MAXIMUM_TRAVERSAL_DISTANCE,
            MAXIMUM_DEPTH: maximumDepth
        });
    }

    draw(delta, camera) {

        this.pathTracingPass.draw(this.targetFrameBuffer, camera);

        // filtering with a separable gaussian blur.

        // horizontal:
        this.filteringPass.draw(this.targetFrameBuffer, this.pathTracingPass.getOutput(), [1.0, 0.0]);

        // vertical:
        const input = {
            color: this.filteringPass.targets[this.filteringPass.previousTarget].color,
            normal: this.pathTracingPass.targets[this.pathTracingPass.previousTarget].normal,
            materialId: this.pathTracingPass.targets[this.pathTracingPass.previousTarget].materialId,
            offsetId: this.pathTracingPass.targets[this.pathTracingPass.previousTarget].offsetId,
            cacheTail: this.pathTracingPass.targets[this.pathTracingPass.previousTarget].cacheTail
        };
        this.filteringPass.draw(this.targetFrameBuffer, input, [0.0, 1.0]);

        this.finalPass.draw(this.filteringPass.getOutput());
    }
}