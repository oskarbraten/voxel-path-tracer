import { mat4 } from '../../../../lib/gl-matrix/index.js';
import { NUMBER_OF_MATERIALS, MATERIAL_ARRAY_BUFFER, generate } from '../../../world/generator.js';

import { build, definesToString } from '../utilities.js';

import frag from './fragment.js';
import vert from './vertex.js';

export default class PathTracingPass {
    constructor(context, width, height, defines = {}) {

        this.width = width;
        this.height = height;

        this.context = context;
        const gl = context;

        defines.NUMBER_OF_MATERIALS = NUMBER_OF_MATERIALS;

        this.rebuild(defines);

        const materialBuffer = gl.createBuffer();
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, materialBuffer);
        gl.bufferData(gl.UNIFORM_BUFFER, MATERIAL_ARRAY_BUFFER, gl.DYNAMIC_DRAW);
        gl.uniformBlockBinding(this.program, gl.getUniformBlockIndex(this.program, 'Materials'), 0);

        const voxelTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_3D, voxelTexture);

        this.voxelTexture = voxelTexture;

        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

        const size = 64;
        const voxels = generate(size);

        gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8UI, size, size, size, 0, gl.RED_INTEGER, gl.UNSIGNED_BYTE, voxels);


        // Set up render target (1) textures:
        const targetFrame0 = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, targetFrame0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // normal texture
        const targetNormal0 = gl.createTexture();
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, targetNormal0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, gl.RGB, gl.UNSIGNED_BYTE, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // material-id texture
        const targetMaterialId0 = gl.createTexture();
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, targetMaterialId0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8UI, width, height, 0, gl.RED_INTEGER, gl.UNSIGNED_BYTE, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // offset-id texture
        const targetOffsetId0 = gl.createTexture();
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, targetOffsetId0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32I, width, height, 0, gl.RED_INTEGER, gl.INT, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // cache-tail texture
        const targetCacheTail0 = gl.createTexture();
        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, targetCacheTail0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


        // Set up render target (2) textures:
        const targetFrame1 = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, targetFrame1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // normal texture
        const targetNormal1 = gl.createTexture();
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, targetNormal1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, gl.RGB, gl.UNSIGNED_BYTE, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // material-id and normal-id texture
        const targetMaterialId1 = gl.createTexture();
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, targetMaterialId1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8UI, width, height, 0, gl.RED_INTEGER, gl.UNSIGNED_BYTE, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // offset-id texture
        const targetOffsetId1 = gl.createTexture();
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, targetOffsetId1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32I, width, height, 0, gl.RED_INTEGER, gl.INT, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // cache-tail texture
        const targetCacheTail1 = gl.createTexture();
        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, targetCacheTail1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // targets for "ping-pong"
        this.targets = [
            {
                color: targetFrame0,
                normal: targetNormal0,
                materialId: targetMaterialId0,
                offsetId: targetOffsetId0,
                cacheTail: targetCacheTail0
            },
            {
                color: targetFrame1,
                normal: targetNormal1,
                materialId: targetMaterialId1,
                offsetId: targetOffsetId1,
                cacheTail: targetCacheTail1
            }
        ];

        this.previousTarget = 0;

        this.previousCameraMatrix = null;
        this.previousViewMatrix = null;
    }

    rebuild(defines) {
        const gl = this.context;

        defines.NUMBER_OF_MATERIALS = NUMBER_OF_MATERIALS;

        const d = definesToString(defines);
        this.program = build(gl, vert.replace('__DEFINES__', d), frag.replace('__DEFINES__', d));

        gl.useProgram(this.program);

        this.uniformLocations = {
            projectionMatrix: gl.getUniformLocation(this.program, 'projection_matrix'),
            inverseProjectionMatrix: gl.getUniformLocation(this.program, 'inverse_projection_matrix'),

            cameraMatrix: gl.getUniformLocation(this.program, 'camera_matrix'),
            viewMatrix: gl.getUniformLocation(this.program, 'view_matrix'),

            previousViewMatrix: gl.getUniformLocation(this.program, 'previous_view_matrix'),
            previousCameraMatrix: gl.getUniformLocation(this.program, 'previous_camera_matrix'),

            reproject: gl.getUniformLocation(this.program, 'reproject'),

            previousColor: gl.getUniformLocation(this.program, 'previous_color'),
            previousNormal: gl.getUniformLocation(this.program, 'previous_normal'),
            previousMaterialId: gl.getUniformLocation(this.program, 'previous_material_id'),
            previousOffsetId: gl.getUniformLocation(this.program, 'previous_offset_id'),
            previousCacheTail: gl.getUniformLocation(this.program, 'previous_cache_tail'),

            resolution: gl.getUniformLocation(this.program, 'resolution'),
            seed: gl.getUniformLocation(this.program, 'seed'),

            voxelData: gl.getUniformLocation(this.program, 'voxel_data'),
        };
    }

    getOutput() {
        return this.targets[this.previousTarget];
    }

    setSize(width, height) {

        this.width = width;
        this.height = height;

        const gl = this.context;
        this.targets.forEach((target) => {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, target.color);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, target.normal);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, gl.RGB, gl.UNSIGNED_BYTE, null);

            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_2D, target.materialId);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8UI, width, height, 0, gl.RG_INTEGER, gl.UNSIGNED_BYTE, null);

            gl.activeTexture(gl.TEXTURE4);
            gl.bindTexture(gl.TEXTURE_2D, target.offsetId);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32I, width, height, 0, gl.RED_INTEGER, gl.INT, null);

            gl.activeTexture(gl.TEXTURE5);
            gl.bindTexture(gl.TEXTURE_2D, target.cacheTail);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, null);
        });

        gl.bindTexture(gl.TEXTURE_2D, null);

        // reset temporal accumulation.
        this.previousCameraMatrix = null;
        this.previousTarget = 0;
    }

    draw(framebuffer, camera, seed = Math.random()) {

        const gl = this.context;

        gl.useProgram(this.program);

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        gl.uniform2f(this.uniformLocations.resolution, this.width, this.height);
        gl.uniform1f(this.uniformLocations.seed, seed);

        gl.uniformMatrix4fv(this.uniformLocations.cameraMatrix, false, camera.worldMatrix);
        gl.uniformMatrix4fv(this.uniformLocations.viewMatrix, false, camera.viewMatrix);

        gl.uniformMatrix4fv(this.uniformLocations.projectionMatrix, false, camera.projectionMatrix);
        gl.uniformMatrix4fv(this.uniformLocations.inverseProjectionMatrix, false, camera.inverseProjectionMatrix);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_3D, this.voxelTexture);
        gl.uniform1i(this.uniformLocations.voxelData, 0);

        if (this.previousCameraMatrix === null) {

            gl.uniform1f(this.uniformLocations.reproject, 0.0);

            this.previousCameraMatrix = mat4.create();
            this.previousViewMatrix = mat4.create();

        } else {

            gl.uniform1f(this.uniformLocations.reproject, 1.0);

            // previous camera matrices:
            gl.uniformMatrix4fv(this.uniformLocations.previousViewMatrix, false, this.previousViewMatrix);
            gl.uniformMatrix4fv(this.uniformLocations.previousCameraMatrix, false, this.previousCameraMatrix);

        }

        const target = (this.previousTarget + 1) % 2;

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.targets[this.previousTarget].color);
        gl.uniform1i(this.uniformLocations.previousColor, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.targets[this.previousTarget].normal);
        gl.uniform1i(this.uniformLocations.previousNormal, 2);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this.targets[this.previousTarget].materialId);
        gl.uniform1i(this.uniformLocations.previousMaterialId, 3);

        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, this.targets[this.previousTarget].offsetId);
        gl.uniform1i(this.uniformLocations.previousOffsetId, 4);

        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, this.targets[this.previousTarget].cacheTail);
        gl.uniform1i(this.uniformLocations.previousCacheTail, 5);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.targets[target].color, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.targets[target].normal, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, this.targets[target].materialId, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT3, gl.TEXTURE_2D, this.targets[target].offsetId, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT4, gl.TEXTURE_2D, this.targets[target].cacheTail, 0);

        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3, gl.COLOR_ATTACHMENT4]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        

        this.previousTarget = target;
        mat4.copy(this.previousCameraMatrix, camera.worldMatrix);
        mat4.copy(this.previousViewMatrix, camera.viewMatrix);

    }

}