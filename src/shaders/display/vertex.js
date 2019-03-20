const glsl = x => x.raw[0];

export default glsl`#version 300 es
precision highp float;

const vec2 data[4] = vec2[](
    vec2(-1.0,  1.0),
    vec2(-1.0, -1.0),
    vec2( 1.0,  1.0),
    vec2( 1.0, -1.0)
);

const vec2 uv_data[4] = vec2[](
    vec2(0.0, 1.0),
    vec2(0.0, 0.0),
    vec2(1.0, 1.0),
    vec2(1.0, 0.0)
);

out vec2 uv;

void main() {
    gl_Position = vec4(data[gl_VertexID], 0.0, 1.0);
    uv = uv_data[gl_VertexID];
}`;