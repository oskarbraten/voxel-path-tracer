const glsl = x => x.raw[0];

export default glsl`#version 300 es

precision highp float;
precision highp int;
precision highp usampler3D;

__DEFINES__

in vec2 uv;
out vec4 fColor;

uniform mat4 camera_matrix;
uniform float camera_fov;
uniform float camera_aspect_ratio;

uniform vec2 screen_dimensions;

uniform float delta_time;
uniform float total_time;
uniform float seed;

uniform usampler3D voxel_data;

struct material {
    vec3 albedo;
    float fuzz;
    float refractive_index;
    int type; /* 0: diffuse, 1: metal, 2: dielectric */
};

layout(std140) uniform Materials {
    material materials[NUMBER_OF_MATERIALS];
};

float rand_seed = 1.0;

float rand() {
    vec2 seeded_uv = vec2(uv.s + rand_seed, uv.t + rand_seed);
    rand_seed += 0.01; // seed;
    // rand_seed += seed;
    return fract(sin(dot(seeded_uv.st, vec2(12.9898,78.233))) * 43758.5453);
}

vec3 random_in_unit_sphere() {
    vec3 p;
    do {
        p = (2.0 * vec3(rand(), rand(), rand())) - vec3(1.0, 1.0, 1.0);
    } while (dot(p, p) >= 1.0);
    return p;
}

struct hit_record {
    float t;
    vec3 position;
    vec3 normal;
    uint id;
};

struct ray {
    vec3 origin;
    vec3 direction;
};

vec3 point_at(ray r, float t) {
    return r.origin + t * r.direction;
}

float schlick(float cosine, float refractive_index) {
    float r0 = (1.0 - refractive_index) / (1.0 + refractive_index);
    r0 = r0 * r0;
    return r0 + (1.0 - r0) * pow((1.0 - cosine), 5.0);
}

// TODO: use built-in function instead.
bool refract_2(vec3 v, vec3 n, float ni_over_nt, out vec3 refracted) {
    vec3 uv = normalize(v);
    float dt = dot(uv, n);
    float discriminant = 1.0 - ni_over_nt * ni_over_nt*(1.0 - dt * dt);
    if (discriminant > 0.0) {
        refracted = ni_over_nt * (uv - n * dt) - n * sqrt(discriminant);
        return true;
    }
    
    return false;
}

bool scatter(ray r, in hit_record record, out vec3 attenuation, out ray scattered) {

    material s = materials[record.id];

    if (s.type == 1) {
        vec3 reflected = reflect(normalize(r.direction), record.normal);
        scattered = ray(record.position, reflected + s.fuzz * random_in_unit_sphere());
        attenuation = s.albedo;
        return (dot(scattered.direction, record.normal) > 0.0);
    } else if (s.type == 2) {
        vec3 outward_normal;
        vec3 reflected = reflect(normalize(r.direction), record.normal);

        float ni_over_nt;
        attenuation = vec3(1.0, 1.0, 1.0);

        float cosine;

        if (dot(r.direction, record.normal) > 0.0) {
            outward_normal = -record.normal;
            ni_over_nt = s.refractive_index;
            cosine = dot(r.direction, record.normal) / length(r.direction);
            cosine = sqrt(1.0 - s.refractive_index * s.refractive_index * (1.0 - cosine * cosine));
        }
        else {
            outward_normal = record.normal;
            ni_over_nt = 1.0 / s.refractive_index;
            cosine = -dot(r.direction, record.normal) / length(r.direction);
        }

        vec3 refracted;

        float reflect_prob;
        if (refract_2(r.direction, outward_normal, ni_over_nt, refracted)) {
            reflect_prob = schlick(cosine, s.refractive_index);
        }
        else {
            reflect_prob = 1.0;
        }

        if (rand() < reflect_prob) {
            scattered = ray(record.position, reflected);
        }
        else {
            scattered = ray(record.position, refracted);
        }

        return true;
    }
    else {
        vec3 target = record.position + record.normal + random_in_unit_sphere();
        scattered = ray(record.position, target - record.position);
        attenuation = s.albedo;
        return true;
    }
}

// TODO: investigate divergence..

// Using a modified version of:
// A Fast Voxel Traversal Algorithm for Ray Tracing, John Amanatides & Andrew Woo. 1987.
bool voxel_traversal(in ray r, out hit_record record) {

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

    do {
        if (t_max.x < t_max.y) {
            if (t_max.x < t_max.z) {
                record.t = t_max.x;
                record.normal = vec3(float(-step.x), 0.0, 0.0);

                t_max.x += t_delta.x;
                current_voxel.x += step.x;
            } else {
                record.t = t_max.z;
                record.normal = vec3(0.0, 0.0, float(-step.z));

                t_max.z += t_delta.z;
                current_voxel.z += step.z;
            }
        } else {
            if (t_max.y < t_max.z) {
                record.t = t_max.y;
                record.normal = vec3(0.0, float(-step.y), 0.0);

                t_max.y += t_delta.y;
                current_voxel.y += step.y;
            } else {
                record.t = t_max.z;
                record.normal = vec3(0.0, 0.0, float(-step.z));

                t_max.z += t_delta.z;
                current_voxel.z += step.z;
            }
        }

        record.id = texelFetch(voxel_data, current_voxel, 0).r;

        if (record.id != 0u) {
            record.position = point_at(r, record.t);
            return true;
        }

        i += 1u;
    } while (i < MAXIMUM_TRAVERSAL_DISTANCE);

    return false;
}

vec3 background(ray r) {
    // float t = 0.5 * (normalize(r.direction).y + 1.0);
    return vec3(1.0, 1.0, 1.0); // mix(vec3(1.0, 1.0, 1.0), vec3(0.5, 0.7, 1.0), t);
}

vec3 trace(ray r) {

    vec3 color = vec3(1.0, 1.0, 1.0);

    hit_record record;

    ray scattered;
  	vec3 attenuation;

    int i = 0;
    while ((i < MAXIMUM_DEPTH) && voxel_traversal(r, record)) {

        scatter(r, record, attenuation, scattered);
        
		r = scattered;
        color *= attenuation;

        i += 1;
    }

    if (i == MAXIMUM_DEPTH) {
        return vec3(0.0, 0.0, 0.0);
    } else {
        return color * background(r);
    }
}

void main() {

    float scale = tan(radians(camera_fov * 0.5));

    vec3 origin = vec3(camera_matrix[3][0], camera_matrix[3][1], camera_matrix[3][2]);
    vec3 direction = normalize((camera_matrix * vec4(uv.x * camera_aspect_ratio * scale, uv.y * scale, -1.0, 0.0)).xyz);
    
    vec3 color = vec3(0.0, 0.0, 0.0);


    for (int i = 0; i < NUMBER_OF_SAMPLES; i++) {

        // float du = rand() / screen_dimensions.x;
        // float dv = rand() / screen_dimensions.y;
        // vec3 aa = vec3(du, dv, 0.0);

        ray r = ray(origin, direction);

        color += trace(r);

    }

    color /= float(NUMBER_OF_SAMPLES);

    fColor = vec4(sqrt(color), 1.0);
}`;
