struct Uniforms {
    mvp: mat4x4f,
    model: mat4x4f,
    eye: vec3f,
    visibility: f32,
    light_pos: vec3f,
    L_e: f32,
    L_a: f32,
    k_d: f32,
    k_s: f32,
    s: f32,
}

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;
@group(0) @binding(1)
var ourSampler: sampler;
@group(0) @binding(2)
var ourTexture: texture_2d<f32>;

// GROUND
struct VSOutGround {
    @builtin(position) position: vec4f,
    @location(0) texCoord: vec2f,
}

@vertex
fn main_vs_ground(@location(0) inPos: vec4f, @location(3) texCoord: vec2f, @builtin(instance_index) instance: u32) -> VSOutGround {
    var vsOut: VSOutGround;
    vsOut.position = uniforms.mvp * inPos;
    vsOut.texCoord = texCoord;
    return vsOut;
}

@fragment
fn main_fs_ground(@location(0) texCoords: vec2f) -> @location(0) vec4f {
    return textureSample(ourTexture, ourSampler, texCoords) * vec4f(uniforms.visibility, uniforms.visibility, uniforms.visibility, 1.0);
}

// MODEL
struct VSOut {
    @builtin(position) position: vec4f,
    @location(0) inPos: vec4f,
    @location(1) color: vec4f,
    @location(2) normal: vec4f,
}