const glsl = x => x.raw[0];

export default glsl`#version 300 es

precision highp float;
precision mediump usampler2D;
precision mediump isampler2D;

__DEFINES__

in vec2 uv;
out vec4 fColor;

uniform vec2 resolution;

uniform sampler2D input_sampler;

uniform usampler2D mn_sampler;
uniform isampler2D p_sampler;

uniform vec2 direction;

vec4 blur13(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {

    uvec2 mn = texture(mn_sampler, uv).rg;

    if (mn.r == 0u) {
        return texture(image, uv);
    }

    int p = texture(p_sampler, uv).r;

    vec4 color = vec4(0.0);

    vec2 off1 = vec2(1.411764705882353) * direction;
    vec2 off2 = vec2(3.2941176470588234) * direction;
    vec2 off3 = vec2(5.176470588235294) * direction;

    color += texture(image, uv) * 0.1964825501511404;

    // offset #1:
    if (mn == texture(mn_sampler, uv + (off1 / resolution)).rg && p == texture(p_sampler, uv + (off1 / resolution)).r) {
        color += texture(image, uv + (off1 / resolution)) * 0.2969069646728344;
    }
    if (mn == texture(mn_sampler, uv - (off1 / resolution)).rg && p == texture(p_sampler, uv - (off1 / resolution)).r) {
        color += texture(image, uv - (off1 / resolution)) * 0.2969069646728344;
    }

    // offset #2:
    if (mn == texture(mn_sampler, uv + (off2 / resolution)).rg && p == texture(p_sampler, uv + (off2 / resolution)).r) {
        color += texture(image, uv + (off2 / resolution)) * 0.09447039785044732;
    }
    if (mn == texture(mn_sampler, uv - (off2 / resolution)).rg && p == texture(p_sampler, uv - (off2 / resolution)).r) {
        color += texture(image, uv - (off2 / resolution)) * 0.09447039785044732;
    }

    // offset #3:
    if (mn == texture(mn_sampler, uv + (off3 / resolution)).rg && p == texture(p_sampler, uv + (off3 / resolution)).r) {
        color += texture(image, uv + (off3 / resolution)) * 0.010381362401148057;
    }
    if (mn == texture(mn_sampler, uv - (off3 / resolution)).rg && p == texture(p_sampler, uv - (off3 / resolution)).r) {
        color += texture(image, uv - (off3 / resolution)) * 0.010381362401148057;
    }

    return color;
}

// vec4 blur9(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
//     vec4 color = vec4(0.0);
//     vec2 off1 = vec2(1.3846153846) * direction;
//     vec2 off2 = vec2(3.2307692308) * direction;
//     color += texture(image, uv) * 0.2270270270;
//     color += texture(image, uv + (off1 / resolution)) * 0.3162162162;
//     color += texture(image, uv - (off1 / resolution)) * 0.3162162162;
//     color += texture(image, uv + (off2 / resolution)) * 0.0702702703;
//     color += texture(image, uv - (off2 / resolution)) * 0.0702702703;
//     return color;
// }

// vec4 blur5(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
//     vec4 color = vec4(0.0);
//     vec2 off1 = vec2(1.3333333333333333) * direction;
//     color += texture(image, uv) * 0.29411764705882354;
//     color += texture(image, uv + (off1 / resolution)) * 0.35294117647058826;
//     color += texture(image, uv - (off1 / resolution)) * 0.35294117647058826;
//     return color;
// }

void main() {
    #ifdef ENABLE_FILTER
    fColor = blur13(input_sampler, uv, resolution, direction);
    #else
    fColor = texture(input_sampler, uv);
    #endif
}`;
