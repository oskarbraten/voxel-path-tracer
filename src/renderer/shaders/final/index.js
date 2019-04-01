import { build } from '../utilities.js';

import frag from './fragment.js';
import vert from './vertex.js';

export default class FinalPass {
    constructor(context) {

        this.program = build(context, vert, frag);
        context.useProgram(this.program);
        this.context = context;

        this.uniformLocations = {
            inputColor: context.getUniformLocation(this.program, 'input_color')
        };

    }

    draw({
        color
    }) {

        this.context.useProgram(this.program);

        this.context.bindFramebuffer(this.context.FRAMEBUFFER, null);

        this.context.activeTexture(this.context.TEXTURE0);
        this.context.bindTexture(this.context.TEXTURE_2D, color);
        this.context.uniform1i(this.uniformLocations.inputColor, 0);

        this.context.drawArrays(this.context.TRIANGLES, 0, 3);
        
    }

}