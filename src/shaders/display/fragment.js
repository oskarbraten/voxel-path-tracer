const glsl = x => x.raw[0];

export default glsl`#version 300 es

precision highp float;

in vec2 uv;
out vec4 fColor;

uniform sampler2D frame;

void main() {
    fColor = texture(frame, uv);
}`;
