import { mat4 } from '../../lib/gl-matrix/index.js';
import { degreesToRadians } from './utilities.js';

import Node from './node.js';

export default class Camera extends Node {
    constructor(aspectRatio, fov = 75, zfar = null, znear = 1.0) {
        super();

        this.aspectRatio = aspectRatio;
        this.yfov = degreesToRadians(fov);
        this.zfar = zfar;
        this.znear = znear;

        this.projectionMatrix = mat4.create();
        this.inverseProjectionMatrix = mat4.create();
        this.viewMatrix = mat4.create();

        this.updateProjectionMatrix();
    }

    updateProjectionMatrix() {
        mat4.perspective(this.projectionMatrix, this.yfov, this.aspectRatio, this.znear, this.zfar);
        mat4.invert(this.inverseProjectionMatrix, this.projectionMatrix);
    }

    tick(parentWorldMatrix = null) {
        super.tick(parentWorldMatrix);
        mat4.invert(this.viewMatrix, this.worldMatrix);
    }
};