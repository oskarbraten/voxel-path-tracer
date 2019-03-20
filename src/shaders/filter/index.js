import { build, definesToString } from '../utilities.js';

import frag from './fragment.js';
import vert from './vertex.js';

export default {
    new(context, argDefines = {}) {

        let defines = definesToString(argDefines);
        
        const program = build(context, vert.replace('__DEFINES__', defines), frag.replace('__DEFINES__', defines));

        context.useProgram(program);

        return {
            program,
            uniformLocations: {
                direction: context.getUniformLocation(program, 'direction'),
                resolution: context.getUniformLocation(program, 'resolution'),

                inputSampler: context.getUniformLocation(program, 'input_sampler'),
                mnSampler: context.getUniformLocation(program, 'mn_sampler'),
                pSampler: context.getUniformLocation(program, 'p_sampler')
            }
        };
    }
}