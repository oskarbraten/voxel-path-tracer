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
                cameraMatrix: context.getUniformLocation(program, 'camera_matrix'),
                cameraFov: context.getUniformLocation(program, 'camera_fov'),
                cameraAspectRatio: context.getUniformLocation(program, 'camera_aspect_ratio'),

                voxelData: context.getUniformLocation(program, 'voxel_data')
            }
        };
    }
}