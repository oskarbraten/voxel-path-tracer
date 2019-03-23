const glsl = x => x.raw[0];

export default glsl`#version 300 es
precision highp float;

uniform mat4 inverse_projection_matrix;
uniform mat4 camera_matrix;
uniform mat4 previous_camera_matrix;

layout(location = 0) in vec2 in_position;
layout(location = 1) in vec2 in_uv;

out vec2 uv;
out vec2 st;

out vec3 ray_direction;
out vec3 previous_ray_direction;

out vec3 camera_origin;
out vec3 previous_camera_origin;

void main() {
    gl_Position = vec4(in_position, 0.0, 1.0);
    st = in_position;
    uv = in_uv;

    ray_direction = (camera_matrix * vec4((inverse_projection_matrix * vec4(in_position, -1.0, 1.0)).xyz, 0.0)).xyz;
    previous_ray_direction = (previous_camera_matrix * vec4((inverse_projection_matrix * vec4(in_position, -1.0, 1.0)).xyz, 0.0)).xyz;

    camera_origin = vec3(camera_matrix[3][0], camera_matrix[3][1], camera_matrix[3][2]);
    previous_camera_origin = vec3(previous_camera_matrix[3][0], previous_camera_matrix[3][1], previous_camera_matrix[3][2]);
}`;