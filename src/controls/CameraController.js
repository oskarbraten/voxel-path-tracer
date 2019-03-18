import { vec3, quat } from '../../lib/gl-matrix/index.js';

export default class CameraController {
    constructor(camera) {
        this.camera = camera;

        this.FD = vec3.fromValues(0, 0, 1);
        this.UD = vec3.fromValues(0, 1, 0);
        this.LD = vec3.fromValues(1, 0, 0);

        this.pitchQuat = quat.create();
        this.yawQuat = quat.create();

        this.longitudinalDirection = vec3.create();
        this.lateralDirection = vec3.create();
    }

    update(pitch, yaw, longitudinal, lateral) {
        
        quat.setAxisAngle(this.pitchQuat, this.LD, -pitch);
        quat.setAxisAngle(this.yawQuat, this.UD, -yaw);

        quat.multiply(this.camera.rotation, this.yawQuat, quat.multiply(this.camera.rotation, this.camera.rotation, this.pitchQuat));

        // longitudinal movement:
        vec3.transformQuat(this.longitudinalDirection, this.FD, this.camera.rotation);
        vec3.normalize(this.longitudinalDirection, this.longitudinalDirection);

        vec3.scale(this.longitudinalDirection, this.longitudinalDirection, -longitudinal);

        this.camera.applyTranslation(...this.longitudinalDirection);

        // lateral movement:
        vec3.transformQuat(this.lateralDirection, this.LD, this.camera.rotation);
        vec3.normalize(this.lateralDirection, this.lateralDirection);

        vec3.scale(this.lateralDirection, this.lateralDirection, -lateral);

        this.camera.applyTranslation(...this.lateralDirection);

    }
}