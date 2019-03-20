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
                frameSampler: context.getUniformLocation(program, 'frame')
            }
        };
    }
}