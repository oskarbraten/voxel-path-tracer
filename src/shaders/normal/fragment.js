const glsl = x => x.raw[0];

export default glsl`#version 300 es

precision highp float;
precision highp int;
precision highp usampler3D;

__DEFINES__

in vec2 uv;
out vec4 id;

uniform mat4 camera_matrix;
uniform float camera_fov;
uniform float camera_aspect_ratio;

uniform usampler3D voxel_data;

struct ray {
    vec3 origin;
    vec3 direction;
};

vec3 point_at(ray r, float t) {
    return r.origin + t * r.direction;
}

// Using a modified version of:
// A Fast Voxel Traversal Algorithm for Ray Tracing, John Amanatides & Andrew Woo. 1987.

int voxel_traversal(in ray r) {

    vec3 origin = r.origin;
    vec3 direction = r.direction;

    ivec3 current_voxel = ivec3(floor(origin / VOXEL_SIZE));

    ivec3 step;

    if (direction.x > 0.0) {
        step.x = 1;
    } else {
        step.x = -1;
    }

    if (direction.y > 0.0) {
        step.y = 1;
    } else {
        step.y = -1;
    }

    if (direction.z > 0.0) {
        step.z = 1;
    } else {
        step.z = -1;
    }

    vec3 next_boundary = vec3(
        float((step.x > 0) ? current_voxel.x + 1 : current_voxel.x) * VOXEL_SIZE,
        float((step.y > 0) ? current_voxel.y + 1 : current_voxel.y) * VOXEL_SIZE,
        float((step.z > 0) ? current_voxel.z + 1 : current_voxel.z) * VOXEL_SIZE
    );

    vec3 t_max = (next_boundary - origin) / direction; // we will move along the axis with the smallest value
    vec3 t_delta = VOXEL_SIZE / direction * vec3(step);

    uint i = 0u;
    int normal_id = 0;

    do {
        if (t_max.x < t_max.y) {
            if (t_max.x < t_max.z) {
                normal_id = 1; // * -step.x;
                t_max.x += t_delta.x;
                current_voxel.x += step.x;
            } else {
                normal_id = 1; // * -step.z;

                t_max.z += t_delta.z;
                current_voxel.z += step.z;
            }
        } else {
            if (t_max.y < t_max.z) {
                normal_id = 1; // * -step.y;

                t_max.y += t_delta.y;
                current_voxel.y += step.y;
            } else {
                normal_id = 1; // * -step.z;

                t_max.z += t_delta.z;
                current_voxel.z += step.z;
            }
        }

        if (texelFetch(voxel_data, current_voxel, 0).r != 0u) {
            return normal_id;
        }

        i += 1u;
    } while (i < MAXIMUM_TRAVERSAL_DISTANCE);

    return 0;
}

void main() {

    float scale = tan(radians(camera_fov * 0.5));

    vec3 origin = vec3(camera_matrix[3][0], camera_matrix[3][1], camera_matrix[3][2]);
    vec3 direction = normalize((camera_matrix * vec4(uv.x * camera_aspect_ratio * scale, uv.y * scale, -1.0, 0.0)).xyz);
    
    ray r = ray(origin, direction);
    id = vec4(float(voxel_traversal(r)), 0.0, 0.0, 1.0);

}`;
