import { vec3 } from '../../lib/gl-matrix/index.js';
import Node from '../core/node.js';

export default {
    new(node = Node.new(), radius = 0.5, {
        albedo = vec3.fromValues(Math.random(), Math.random(), Math.random()),
        type = ((Math.random() > 0.8) ? 2 : ((Math.random() > 0.5) ? 1 : 0)),
        fuzz = Math.random() * 0.5,
        refractiveIndex = 1.33 + (Math.random() * 1.4)
    } = {}) {
        return {
            node,
            radius,
            material: {
                albedo,
                type,
                fuzz,
                refractiveIndex
            }
        };
    }
}