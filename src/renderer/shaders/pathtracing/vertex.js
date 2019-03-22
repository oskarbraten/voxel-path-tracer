const glsl = x => x.raw[0];

export default glsl`#version 300 es
precision highp float;

layout(location = 0) in vec2 in_data;
layout(location = 1) in vec2 in_uv;

out vec2 uv;
out vec2 st;

void main() {
    gl_Position = vec4(in_data, 0.0, 1.0);
    st = in_data;
    uv = in_uv;
}`;