struct Uniforms {
    mvp: mat4x4f,
    model: mat4x4f,
    eye: vec3f,
}

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;
@group(0) @binding(1)
var ourSampler: sampler;
@group(0) @binding(2)
var ourTexture: texture_2d<f32>;

struct VSOut {
    @builtin(position) position: vec4f,
    @location(0) texCoord: vec2f,
    @location(1) normal: vec4f,
    @location(2) inPos: vec4f,
}

@vertex
fn main_vs_texture(@location(0) inPos: vec4f, @location(1) texCoord: vec2f, @location(2) normal: vec4f, @builtin(instance_index) instance: u32) -> VSOut {
    var vsOut: VSOut;
    vsOut.position = uniforms.mvp * inPos;
    vsOut.texCoord = texCoord;
    vsOut.normal = normal;
    vsOut.inPos = inPos;
    return vsOut;
}

@fragment
fn main_fs_texture(@location(0) texCoords: vec2f, @location(2) inPos: vec4f) -> @location(0) vec4f {
    let texColor = textureSample(ourTexture, ourSampler, texCoords);
    let distance = length(uniforms.eye - (uniforms.model * inPos).xyz);
    // The distance at which the fog starts appearing
    const fogStart: f32 = 0.5;
    // The distance where the fog has full effect
    const fogFull: f32 = 6.5;
    const fogColor: vec4f = vec4f(0.0, 0.0, 0.0, 1.0);
    let fogFactor = clamp((distance - fogStart) / (fogFull - fogStart), 0.0, 1.0);
    let finalColor = mix(texColor, fogColor, fogFactor);
    return finalColor;
}

struct VSOutKey {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
    @location(1) normal: vec4f,
    @location(2) inPos: vec4f,
}

@vertex
fn main_vs_color(@location(0) inPos: vec4f, @location(1) color: vec4f, @location(2) normal: vec4f, @builtin(instance_index) instance: u32) -> VSOutKey {
    var vsOut: VSOutKey;
    vsOut.position = uniforms.mvp * inPos;
    vsOut.color = color;
    vsOut.normal = normal;
    vsOut.inPos = inPos;
    return vsOut;
}

@fragment
fn main_fs_color(@location(0) color: vec4f, @location(2) inPos: vec4f) -> @location(0) vec4f {
    let distanceToEye = length(uniforms.eye.xz - (uniforms.model * inPos).xz);

    // Fog parameters
    let startFogDistance: f32 = 1.0;
    let fullFogDistance: f32 = 8.0;

    // Calculate fog factor [0.0 - 1.0] based on distance
    let fogFactor = clamp((distanceToEye - startFogDistance) / (fullFogDistance - startFogDistance), 0.0, 1.0);

    // Mix the color with fog color (black) based on fog factor
    let fogColor: vec4f = vec4f(0.0, 0.0, 0.0, 1.0);
    let finalColor = mix(color, fogColor, fogFactor);
    return finalColor;

}