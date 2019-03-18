import Node from './node.js';

export default {
    new(size = 32) {

        let voxels = new Uint8Array(size * size * size);

        for (let k = 0; k < size; k++) {
            for (let j = 0; j < size; j++) {
                for (let i = 0; i < size; i++) {
                    voxels[i + j * size + k * size * size] = (Math.random() < 0.8) ? 0 : 1;
                }
            }
        }

        return {
            node: Node.new(),
            voxels
        };
    }
}