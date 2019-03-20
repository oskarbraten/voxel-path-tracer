const glsl = x => x.raw[0];

export default glsl`#version 300 es

precision highp float;
precision highp usampler3D;

__DEFINES__

in vec2 uv;
layout(location = 0) out uvec2 id; // x = material-id, y = normal-id
layout(location = 1) out int offset;

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

uvec2 voxel_traversal(in ray r) {

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

    int i = 0;

    int normal_id = 0;
    uint material_id = 0u;
    
    // TODO: take offset wrt. camera position.

    do {
        if (t_max.x < t_max.y) {
            if (t_max.x < t_max.z) {
                normal_id = 1 * -step.x;
                offset = current_voxel.x;

                t_max.x += t_delta.x;
                current_voxel.x += step.x;
            } else {
                normal_id = 3 * -step.z;
                offset = current_voxel.z;

                t_max.z += t_delta.z;
                current_voxel.z += step.z;
            }
        } else {
            if (t_max.y < t_max.z) {
                normal_id = 2 * -step.y;
                offset = current_voxel.y;

                t_max.y += t_delta.y;
                current_voxel.y += step.y;
            } else {
                normal_id = 3 * -step.z;
                offset = current_voxel.z;

                t_max.z += t_delta.z;
                current_voxel.z += step.z;
            }
        }

        material_id = texelFetch(voxel_data, current_voxel, 0).r;
        if (material_id != 0u) {
            return uvec2(material_id, 3u + uint(normal_id));
        }

        i += 1;
    } while (i < MAXIMUM_TRAVERSAL_DISTANCE);

    return uvec2(0u, 0u);
}

void main() {

    float scale = tan(radians(camera_fov * 0.5));

    vec3 origin = vec3(camera_matrix[3][0], camera_matrix[3][1], camera_matrix[3][2]);
    vec3 direction = normalize((camera_matrix * vec4(uv.x * camera_aspect_ratio * scale, uv.y * scale, -1.0, 0.0)).xyz);
    
    ray r = ray(origin, direction);
    id = voxel_traversal(r);

}`;
