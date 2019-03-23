import { mat4 } from '../../../../lib/gl-matrix/index.js';
import { NUMBER_OF_MATERIALS, MATERIAL_ARRAY_BUFFER, generate } from '../../../world/generator.js';

import { build, definesToString } from '../utilities.js';

import frag from './fragment.js';
import vert from './vertex.js';

export default class PathTracingPass {
    constructor(context, width, height, defines = {}) {

        this.context = context;

        defines.NUMBER_OF_MATERIALS = NUMBER_OF_MATERIALS;

        this.rebuild(defines);

        const materialBuffer = context.createBuffer();
        context.bindBufferBase(context.UNIFORM_BUFFER, 0, materialBuffer);
        context.bufferData(context.UNIFORM_BUFFER, MATERIAL_ARRAY_BUFFER, context.DYNAMIC_DRAW);
        context.uniformBlockBinding(this.program, context.getUniformBlockIndex(this.program, 'Materials'), 0);

        const voxelTexture = context.createTexture();
        context.activeTexture(context.TEXTURE0);
        context.bindTexture(context.TEXTURE_3D, voxelTexture);

        context.texParameteri(context.TEXTURE_3D, context.TEXTURE_MAG_FILTER, context.NEAREST);
        context.texParameteri(context.TEXTURE_3D, context.TEXTURE_MIN_FILTER, context.NEAREST);

        const size = 64;
        const voxels = generate(size);

        context.texImage3D(context.TEXTURE_3D, 0, context.R8UI, size, size, size, 0, context.RED_INTEGER, context.UNSIGNED_BYTE, voxels);

        // set up render target texture:
        const targetFrame0 = context.createTexture();
        context.activeTexture(context.TEXTURE1);
        context.bindTexture(context.TEXTURE_2D, targetFrame0);
        context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, width, height, 0, context.RGBA, context.UNSIGNED_BYTE, null);

        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);


        // set up render target texture:
        const targetFrame1 = context.createTexture();
        context.activeTexture(context.TEXTURE1);
        context.bindTexture(context.TEXTURE_2D, targetFrame1);
        context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, width, height, 0, context.RGBA, context.UNSIGNED_BYTE, null);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);

        context.bindTexture(context.TEXTURE_2D, null);

        this.targets = [targetFrame0, targetFrame1];
        this.previousFrame = 0;

        this.previousCameraMatrix = null;
        this.previousViewMatrix = null;

        this.totalNumberOfSamples = 0;
    }

    rebuild(defines) {
        defines.NUMBER_OF_MATERIALS = NUMBER_OF_MATERIALS;
        let d = definesToString(defines);
        this.program = build(this.context, vert.replace('__DEFINES__', d), frag.replace('__DEFINES__', d));

        this.context.useProgram(this.program);

        this.uniformLocations = {
            projectionMatrix: this.context.getUniformLocation(this.program, 'projection_matrix'),
            inverseProjectionMatrix: this.context.getUniformLocation(this.program, 'inverse_projection_matrix'),

            cameraMatrix: this.context.getUniformLocation(this.program, 'camera_matrix'),

            previousViewMatrix: this.context.getUniformLocation(this.program, 'previous_view_matrix'),
            previousCameraMatrix: this.context.getUniformLocation(this.program, 'previous_camera_matrix'),
            
            reproject: this.context.getUniformLocation(this.program, 'reproject'),
            previousFrame: this.context.getUniformLocation(this.program, 'previous_frame'),
            

            resolution: this.context.getUniformLocation(this.program, 'resolution'),
            seed: this.context.getUniformLocation(this.program, 'seed'),

            voxelData: this.context.getUniformLocation(this.program, 'voxel_data'),

            totalNumberOfSamples: this.context.getUniformLocation(this.program, 'total_number_of_samples')
        };
    }

    setSize(width, height) {
        const context = this.context;
        this.targets.forEach((target) => {
            context.bindTexture(context.TEXTURE_2D, target);
            context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, width, height, 0, context.RGBA, context.UNSIGNED_BYTE, null);
        });

        context.bindTexture(context.TEXTURE_2D, null);
    }

    draw(framebuffer, {
        resolution,
        camera,
        seed = Math.random()
    }) {

        this.context.useProgram(this.program);

        this.context.bindFramebuffer(this.context.FRAMEBUFFER, framebuffer);

        this.context.uniform2f(this.uniformLocations.resolution, ...resolution);
        this.context.uniform1f(this.uniformLocations.seed, seed);

        this.context.uniformMatrix4fv(this.uniformLocations.cameraMatrix, false, camera.worldMatrix);
        
        this.context.uniformMatrix4fv(this.uniformLocations.projectionMatrix, false, camera.projectionMatrix);
        this.context.uniformMatrix4fv(this.uniformLocations.inverseProjectionMatrix, false, camera.inverseProjectionMatrix);

        this.context.uniform1ui(this.uniformLocations.totalNumberOfSamples, this.totalNumberOfSamples);

        if (this.previousCameraMatrix === null) {

            this.context.uniform1i(this.uniformLocations.reproject, false);

            this.context.activeTexture(this.context.TEXTURE1);
            this.context.bindTexture(this.context.TEXTURE_2D, this.targets[1]);
            this.context.uniform1i(this.uniformLocations.previousFrame, 1);

            this.context.framebufferTexture2D(this.context.FRAMEBUFFER, this.context.COLOR_ATTACHMENT0, this.context.TEXTURE_2D, this.targets[0], 0);

            this.context.drawBuffers([this.context.COLOR_ATTACHMENT0]);

            this.context.drawArrays(this.context.TRIANGLE_STRIP, 0, 4);

            this.previousCameraMatrix = mat4.create();
            this.previousViewMatrix = mat4.create();

        } else {

            this.context.uniform1i(this.uniformLocations.reproject, true);

            // previous camera matrices:
            this.context.uniformMatrix4fv(this.uniformLocations.previousViewMatrix, false, this.previousViewMatrix);
            this.context.uniformMatrix4fv(this.uniformLocations.previousCameraMatrix, false, this.previousCameraMatrix);

            const target = (this.previousFrame + 1) % 2;

            const targetFrame = this.targets[target];
            const previousFrame = this.targets[this.previousFrame];

            this.context.activeTexture(this.context.TEXTURE1);
            this.context.bindTexture(this.context.TEXTURE_2D, previousFrame);
            this.context.uniform1i(this.uniformLocations.previousFrame, 1);

            this.context.framebufferTexture2D(this.context.FRAMEBUFFER, this.context.COLOR_ATTACHMENT0, this.context.TEXTURE_2D, targetFrame, 0);

            this.context.drawBuffers([this.context.COLOR_ATTACHMENT0]);

            this.context.drawArrays(this.context.TRIANGLE_STRIP, 0, 4);

            this.previousFrame = target;

        }

        mat4.copy(this.previousCameraMatrix, camera.worldMatrix);
        mat4.copy(this.previousViewMatrix, camera.viewMatrix);

        this.totalNumberOfSamples += 1;
        
    }

}