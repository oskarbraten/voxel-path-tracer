import { vec3, mat4, quat } from '../../lib/gl-matrix/index.js';

export default {
    new({
        parent = null,
        children = [],

        rotation = quat.create(),
        translation = vec3.fromValues(0, 0, 0),
        scale = vec3.fromValues(1, 1, 1),

        matrix = null

    } = {}) {

        const node = {

            children,

            localMatrix: mat4.create(),
            worldMatrix: mat4.create(),

            translation,
            scale,
            rotation, // quaternion

            add(child) {
                if (child && this.children.indexOf(child) === -1) {
                    this.children.push(child);
                }
            },

            remove(child) {
                if (child) {
                    let index = this.children.indexOf(child);

                    if (index !== -1) {
                        this.children.splice(index, 1);
                        child.parent = null;
                    }
                }
            },

            tick(parentWorldMatrix = null) {
                this.updateLocalMatrix(); // Recalculate this node's localMatrix.

                // Do this if the node has a parent
                if (parentWorldMatrix !== null) {

                    // Multiply the localMatrix of this node with the worldMatrix of its parent.
                    mat4.multiply(this.worldMatrix, parentWorldMatrix, this.localMatrix);

                } else {

                    //Just set the localMatrix as the worldMatrix since this node does not have a parent
                    mat4.copy(this.worldMatrix, this.localMatrix);

                }

                // Propagate the update downwards in the scene tree 
                //(the children will use this node's worldMatrix in the tick)
                for (let i = 0; i < this.children.length; i++) {
                    this.children[i].tick(this.worldMatrix);
                }

            },

            updateLocalMatrix() {
                mat4.fromRotationTranslationScale(this.localMatrix, this.rotation, this.translation, this.scale);
            },

            setScale(x, y, z) {
                this.scale[0] = x;
                this.scale[1] = y;
                this.scale[2] = z;
            },

            applyScale(x, y, z) {
                this.scale[0] *= x;
                this.scale[1] *= y;
                this.scale[2] *= z;
            },

            setTranslation(x, y, z) {
                this.translation[0] = x;
                this.translation[1] = y;
                this.translation[2] = z;
            },

            applyTranslation(x, y, z) {
                this.translation[0] += x;
                this.translation[1] += y;
                this.translation[2] += z;
            },

            setRotationFromEuler(x, y, z) {
                quat.fromEuler(this.rotation, x, y, z);
            },

            applyRotationX(rad) {
                quat.rotateX(this.rotation, this.rotation, rad);
            },

            applyRotationY(rad) {
                quat.rotateY(this.rotation, this.rotation, rad);
            },

            applyRotationZ(rad) {
                quat.rotateZ(this.rotation, this.rotation, rad);
            }
        };

        if (parent) {
            parent.add(node);
        }

        if (matrix) {
            mat4.getRotation(node.rotation, matrix);
            mat4.getTranslation(node.translation, matrix);
            mat4.getScaling(node.scale, matrix);
        }

        return node;
    }
};