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
    float weight_sum = 0.0;

    vec2 off1 = vec2(1.411764705882353) * direction;
    vec2 off2 = vec2(3.2941176470588234) * direction;
    vec2 off3 = vec2(5.176470588235294) * direction;

    color += texture(image, uv) * 0.1964825501511404;
    weight_sum += 0.1964825501511404;

    // offset #1:
    if (mn == texture(mn_sampler, uv + (off1 / resolution)).rg && p == texture(p_sampler, uv + (off1 / resolution)).r) {
        color += texture(image, uv + (off1 / resolution)) * 0.2969069646728344;
        weight_sum += 0.2969069646728344;
    }
    if (mn == texture(mn_sampler, uv - (off1 / resolution)).rg && p == texture(p_sampler, uv - (off1 / resolution)).r) {
        color += texture(image, uv - (off1 / resolution)) * 0.2969069646728344;
        weight_sum += 0.2969069646728344;
    }

    // offset #2:
    if (mn == texture(mn_sampler, uv + (off2 / resolution)).rg && p == texture(p_sampler, uv + (off2 / resolution)).r) {
        color += texture(image, uv + (off2 / resolution)) * 0.09447039785044732;
        weight_sum += 0.09447039785044732;
    }
    if (mn == texture(mn_sampler, uv - (off2 / resolution)).rg && p == texture(p_sampler, uv - (off2 / resolution)).r) {
        color += texture(image, uv - (off2 / resolution)) * 0.09447039785044732;
        weight_sum += 0.09447039785044732;
    }

    // offset #3:
    if (mn == texture(mn_sampler, uv + (off3 / resolution)).rg && p == texture(p_sampler, uv + (off3 / resolution)).r) {
        color += texture(image, uv + (off3 / resolution)) * 0.010381362401148057;
        weight_sum += 0.010381362401148057;
    }
    if (mn == texture(mn_sampler, uv - (off3 / resolution)).rg && p == texture(p_sampler, uv - (off3 / resolution)).r) {
        color += texture(image, uv - (off3 / resolution)) * 0.010381362401148057;
        weight_sum += 0.010381362401148057;
    }

    return vec4(color.rgb / weight_sum, 1.0);
}

vec4 blur(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {

    uvec2 mn = texture(mn_sampler, uv).rg;

    if (mn.r == 0u) {
        return texture(image, uv); // no need to blur air..
    }

    int p = texture(p_sampler, uv).r;

    vec4 sum = vec4(0.0);
    float weight_sum = 0.0;
    
    ivec2 center = ivec2(uv * resolution);

    ivec2 offset_4p = (center + ivec2(4) * ivec2(direction));
    ivec2 offset_3p = (center + ivec2(3) * ivec2(direction));
    ivec2 offset_2p = (center + ivec2(2) * ivec2(direction));
    ivec2 offset_1p = (center + ivec2(1) * ivec2(direction));

    ivec2 offset_4n = (center + ivec2(-4) * ivec2(direction));
    ivec2 offset_3n = (center + ivec2(-3) * ivec2(direction));
    ivec2 offset_2n = (center + ivec2(-2) * ivec2(direction));
    ivec2 offset_1n = (center + ivec2(-1) * ivec2(direction));

    if (mn == texelFetch(mn_sampler, offset_4n, 0).rg && p == texelFetch(p_sampler, offset_4n, 0).r) {
        sum += texelFetch(image, offset_4n, 0) * 0.0162162162;
        weight_sum += 0.0162162162;
    }

    if (mn == texelFetch(mn_sampler, offset_3n, 0).rg && p == texelFetch(p_sampler, offset_3n, 0).r) {
        sum += texelFetch(image, offset_3n, 0) * 0.0540540541;
        weight_sum += 0.0540540541;
    }
    
    if (mn == texelFetch(mn_sampler, offset_2n, 0).rg && p == texelFetch(p_sampler, offset_2n, 0).r) {
        sum += texelFetch(image, offset_2n, 0) * 0.1216216216;
        weight_sum += 0.1216216216;
    }

    if (mn == texelFetch(mn_sampler, offset_1n, 0).rg && p == texelFetch(p_sampler, offset_1n, 0).r) {
        sum += texelFetch(image, offset_1n, 0) * 0.1945945946;
        weight_sum += 0.1945945946;
    }
	
    sum += texelFetch(image, center, 0) * 0.2270270270;
    weight_sum += 0.2270270270;
    
    if (mn == texelFetch(mn_sampler, offset_1p, 0).rg && p == texelFetch(p_sampler, offset_1p, 0).r) {
        sum += texelFetch(image, offset_1p, 0) * 0.1945945946;
        weight_sum += 0.1945945946;
    }

    if (mn == texelFetch(mn_sampler, offset_2p, 0).rg && p == texelFetch(p_sampler, offset_2p, 0).r) {
        sum += texelFetch(image, offset_2p, 0) * 0.1216216216;
        weight_sum += 0.1216216216;
    }

    if (mn == texelFetch(mn_sampler, offset_3p, 0).rg && p == texelFetch(p_sampler, offset_3p, 0).r) {
        sum += texelFetch(image, offset_3p, 0) * 0.0540540541;
        weight_sum += 0.0540540541;
    }

    if (mn == texelFetch(mn_sampler, offset_4p, 0).rg && p == texelFetch(p_sampler, offset_4p, 0).r) {
        sum += texelFetch(image, offset_4p, 0) * 0.0162162162;
        weight_sum += 0.0162162162;
    }

	return vec4(sum.rgb / weight_sum, 1.0);
}

vec4 average(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {

    vec4 c = texture(image, uv);

    uvec2 mn = texture(mn_sampler, uv).rg;
    if (mn.r == 0u) {
        return c; // no need to blur air..
    }

    int p = texture(p_sampler, uv).r;

    vec4 sum = vec4(0.0);
    int n = 0;
    
    ivec2 center = ivec2(uv * resolution);

    ivec2 offset_5p = (center + ivec2(5) * ivec2(direction));
    ivec2 offset_4p = (center + ivec2(4) * ivec2(direction));
    ivec2 offset_3p = (center + ivec2(3) * ivec2(direction));
    ivec2 offset_2p = (center + ivec2(2) * ivec2(direction));
    ivec2 offset_1p = (center + ivec2(1) * ivec2(direction));

    ivec2 offset_5n = (center + ivec2(-5) * ivec2(direction));
    ivec2 offset_4n = (center + ivec2(-4) * ivec2(direction));
    ivec2 offset_3n = (center + ivec2(-3) * ivec2(direction));
    ivec2 offset_2n = (center + ivec2(-2) * ivec2(direction));
    ivec2 offset_1n = (center + ivec2(-1) * ivec2(direction));

    if (mn == texelFetch(mn_sampler, offset_5n, 0).rg && p == texelFetch(p_sampler, offset_5n, 0).r) {
        sum += texelFetch(image, offset_5n, 0);
        n++;
    }

    if (mn == texelFetch(mn_sampler, offset_4n, 0).rg && p == texelFetch(p_sampler, offset_4n, 0).r) {
        sum += texelFetch(image, offset_4n, 0);
        n++;
    }

    if (mn == texelFetch(mn_sampler, offset_3n, 0).rg && p == texelFetch(p_sampler, offset_3n, 0).r) {
        sum += texelFetch(image, offset_3n, 0);
        n++;
    }
    
    if (mn == texelFetch(mn_sampler, offset_2n, 0).rg && p == texelFetch(p_sampler, offset_2n, 0).r) {
        sum += texelFetch(image, offset_2n, 0);
        n++;
    }

    if (mn == texelFetch(mn_sampler, offset_1n, 0).rg && p == texelFetch(p_sampler, offset_1n, 0).r) {
        sum += texelFetch(image, offset_1n, 0);
        n++;
    }
	
    sum += texelFetch(image, center, 0);
    n++;
    
    if (mn == texelFetch(mn_sampler, offset_1p, 0).rg && p == texelFetch(p_sampler, offset_1p, 0).r) {
        sum += texelFetch(image, offset_1p, 0);
        n++;
    }

    if (mn == texelFetch(mn_sampler, offset_2p, 0).rg && p == texelFetch(p_sampler, offset_2p, 0).r) {
        sum += texelFetch(image, offset_2p, 0);
        n++;
    }

    if (mn == texelFetch(mn_sampler, offset_3p, 0).rg && p == texelFetch(p_sampler, offset_3p, 0).r) {
        sum += texelFetch(image, offset_3p, 0);
        n++;
    }

    if (mn == texelFetch(mn_sampler, offset_4p, 0).rg && p == texelFetch(p_sampler, offset_4p, 0).r) {
        sum += texelFetch(image, offset_4p, 0);
        n++;
    }

    if (mn == texelFetch(mn_sampler, offset_5p, 0).rg && p == texelFetch(p_sampler, offset_5p, 0).r) {
        sum += texelFetch(image, offset_5p, 0);
        n++;
    }

	return mix(c, vec4(sum.rgb / float(n), 1.0), 0.9);
}

void main() {
    #ifdef ENABLE_FILTER
    fColor = average(input_sampler, uv, resolution, direction);
    #else
    fColor = texture(input_sampler, uv);
    #endif
}`;
