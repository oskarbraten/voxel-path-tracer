import { build } from '../utilities.js';

import frag from './fragment.js';
import vert from './vertex.js';

export default class FilteringPass {
    constructor(context, width, height) {

        this.width = width;
        this.height = height;

        this.program = build(context, vert, frag);
        context.useProgram(this.program);
        this.context = context;

        this.uniformLocations = {
            direction: context.getUniformLocation(this.program, 'direction'),
            resolution: context.getUniformLocation(this.program, 'resolution'),

            inputColor: context.getUniformLocation(this.program, 'input_color'),
            inputNormal: context.getUniformLocation(this.program, 'input_normal'),
            inputMaterialId: context.getUniformLocation(this.program, 'input_material_id'),
            inputOffsetId: context.getUniformLocation(this.program, 'input_offset_id'),
            inputCacheTail: context.getUniformLocation(this.program, 'input_cache_tail'),
        };

        const gl = this.context;

        const targetColor0 = gl.createTexture();
        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, targetColor0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const targetColor1 = gl.createTexture();
        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, targetColor1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // target for "ping-pong"
        this.targets = [
            {
                color: targetColor0
            },
            {
                color: targetColor1
            }
        ];

        this.previousTarget = 0;

    }

    getOutput() {
        return this.targets[this.previousTarget];
    }

    setSize(width, height) {

        this.width = width;
        this.height = height;

        const gl = this.context;
        this.targets.forEach((target) => {
            gl.activeTexture(gl.TEXTURE5);
            gl.bindTexture(gl.TEXTURE_2D, target.color);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        });

        gl.bindTexture(gl.TEXTURE_2D, null);

    }

    draw(framebuffer, {
        color,
        normal,
        materialId,
        offsetId,
        cacheTail
    }, direction) {

        const gl = this.context;

        gl.useProgram(this.program);

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        gl.uniform2f(this.uniformLocations.resolution, this.width, this.height);
        gl.uniform2f(this.uniformLocations.direction, ...direction);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, color);
        gl.uniform1i(this.uniformLocations.inputColor, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, normal);
        gl.uniform1i(this.uniformLocations.inputNormal, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, materialId);
        gl.uniform1i(this.uniformLocations.inputMaterialId, 2);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, offsetId);
        gl.uniform1i(this.uniformLocations.inputOffsetId, 3);

        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, cacheTail);
        gl.uniform1i(this.uniformLocations.inputCacheTail, 4);

        const target = (this.previousTarget + 1) % 2;

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.targets[target].color, 0);

        gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

        gl.drawArrays(gl.TRIANGLES, 0, 3);

        this.previousTarget = target;
    }

}