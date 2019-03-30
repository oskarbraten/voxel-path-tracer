import { build } from '../utilities.js';

import frag from './fragment.js';
import vert from './vertex.js';

export default class FinalPass {
    constructor(context) {

        this.program = build(context, vert, frag);
        context.useProgram(this.program);
        this.context = context;

        this.uniformLocations = {
            inputColor: context.getUniformLocation(this.program, 'input_color'),
            inputNormal: context.getUniformLocation(this.program, 'input_normal'),
            inputMaterialId: context.getUniformLocation(this.program, 'input_material_id'),
            inputOffsetId: context.getUniformLocation(this.program, 'input_offset_id'),
            inputCacheTail: context.getUniformLocation(this.program, 'input_cache_tail'),
        };

    }

    draw({
        color,
        normal,
        materialId,
        offsetId,
        cacheTail
    }) {

        this.context.useProgram(this.program);

        this.context.bindFramebuffer(this.context.FRAMEBUFFER, null);

        this.context.activeTexture(this.context.TEXTURE0);
        this.context.bindTexture(this.context.TEXTURE_2D, color);
        this.context.uniform1i(this.uniformLocations.inputColor, 0);

        this.context.activeTexture(this.context.TEXTURE1);
        this.context.bindTexture(this.context.TEXTURE_2D, normal);
        this.context.uniform1i(this.uniformLocations.inputNormal, 1);

        this.context.activeTexture(this.context.TEXTURE2);
        this.context.bindTexture(this.context.TEXTURE_2D, materialId);
        this.context.uniform1i(this.uniformLocations.inputMaterialId, 2);

        this.context.activeTexture(this.context.TEXTURE3);
        this.context.bindTexture(this.context.TEXTURE_2D, offsetId);
        this.context.uniform1i(this.uniformLocations.inputOffsetId, 3);

        this.context.activeTexture(this.context.TEXTURE4);
        this.context.bindTexture(this.context.TEXTURE_2D, cacheTail);
        this.context.uniform1i(this.uniformLocations.inputCacheTail, 4);

        this.context.drawArrays(this.context.TRIANGLES, 0, 3);
        
    }

}