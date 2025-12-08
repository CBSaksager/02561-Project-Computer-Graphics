"use strict";

function setupInputListeners(onchange) {
    document.getElementById('emitted-radiance').oninput = onchange;
    document.getElementById('ambient-radiance').oninput = onchange;
    document.getElementById('diffuse').oninput = onchange;
    document.getElementById('specular').oninput = onchange;
    document.getElementById('shininess').oninput = onchange;
}

function getOptions() {
    const emittedRadianceSlider = document.getElementById('emitted-radiance');
    const ambientRadianceSlider = document.getElementById('ambient-radiance');
    const diffuseSlider = document.getElementById('diffuse');
    const specularSlider = document.getElementById('specular');
    const shininessSlider = document.getElementById('shininess');

    return {
        emittedRadianceSlider: parseFloat(emittedRadianceSlider.value),
        ambientRadianceSlider: parseFloat(ambientRadianceSlider.value),
        diffuseSlider: parseFloat(diffuseSlider.value),
        specularSlider: parseFloat(specularSlider.value),
        shininessSlider: parseFloat(shininessSlider.value),
    };
}

async function main() {
    const gpu = navigator.gpu;
    const adapter = await gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const canvas = document.getElementById('my-canvas');
    const context = canvas.getContext('webgpu');
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device: device,
        format: canvasFormat,
    });

    // Segway orientation state
    let orientation = {
        side: 0,
        front: 0
    };

    // Device orientation
    window.addEventListener('deviceorientation', handleOrientation);
    function handleOrientation(event) {
        console.log(event);

        document.getElementById('orientation-text').textContent = `alpha: ${event.alpha?.toFixed(2)}, beta: ${event.beta?.toFixed(2)}, gamma: ${event.gamma?.toFixed(2)}`;

        orientation.front = event.beta;
        orientation.side = event.alpha;
    }

    // Keyboard controls
    window.addEventListener('keydown', handleKeyDown);
    function handleKeyDown(event) {
        const step = 2.5; // degrees per key press

        switch (event.key) {
            case 'ArrowUp':
                orientation.front += step;
                break;
            case 'ArrowDown':
                orientation.front -= step;
                break;
            case 'ArrowLeft':
                orientation.side -= step;
                break;
            case 'ArrowRight':
                orientation.side += step;
                break;
        }
    }

    // SHARED
    const positionBufferLayout = {
        arrayStride: sizeof['vec4'],
        attributes: [{
            format: 'float32x4',
            offset: 0,
            shaderLocation: 0,
        }],
    };

    // TEAPOT
    const obj_filename = "teapot.obj";
    const obj = await readOBJFile(obj_filename, 1, true);

    const teapotPositions = obj.vertices;
    const teapotPositionBuffer = device.createBuffer({
        size: sizeof['vec4'] * teapotPositions.length,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(teapotPositionBuffer, 0, flatten(teapotPositions));

    const teapotColors = obj.colors;
    const teapotColorBuffer = device.createBuffer({
        size: sizeof['vec4'] * teapotColors.length,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    const teapotColorBufferLayout = {
        arrayStride: sizeof['vec4'],
        attributes: [{
            format: 'float32x4',
            offset: 0,
            shaderLocation: 1,
        }],
    };
    device.queue.writeBuffer(teapotColorBuffer, 0, flatten(teapotColors));

    const teapotNormals = obj.normals;
    const teapotNormalBuffer = device.createBuffer({
        size: sizeof['vec4'] * teapotNormals.length,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    const teapotNormalBufferLayout = {
        arrayStride: sizeof['vec4'],
        attributes: [{
            format: 'float32x4',
            offset: 0,
            shaderLocation: 2,
        }],
    };
    device.queue.writeBuffer(teapotNormalBuffer, 0, flatten(teapotNormals));

    const teapotIndices = obj.indices;
    const teapotIndicesBuffer = device.createBuffer({
        size: sizeof['vec4'] * teapotIndices.length,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(teapotIndicesBuffer, 0, teapotIndices);

    const teapotUniformBuffer = device.createBuffer({
        size: sizeof['mat4'] * 2 + sizeof['vec4'] * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // GROUND
    let positionsGround = [
        vec3(-2, -1, -1),
        vec3(2, -1, -1),
        vec3(2, -1, -5),
        vec3(-2, -1, -5),
    ];

    let indicesGround = new Uint32Array([
        0, 1, 2,
        0, 2, 3,
    ]);

    const groundPositionBuffer = device.createBuffer({
        size: sizeof['vec3'] * positionsGround.length,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const groundPositionBufferLayout = {
        arrayStride: sizeof['vec3'],
        attributes: [{
            format: 'float32x3',
            offset: 0,
            shaderLocation: 0,
        }],
    };

    const groundIndicesBuffer = device.createBuffer({
        size: sizeof['vec3'] * indicesGround.length,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    const groundTexcoords = [
        vec2(0.0, 0.0),
        vec2(1.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 1.0),
    ];
    const groundTexcoordBuffer = device.createBuffer({
        size: sizeof['vec2'] * groundTexcoords.length,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    const groundTexcoordBufferLayout = {
        arrayStride: sizeof['vec2'],
        attributes: [{
            format: 'float32x2',
            offset: 0,
            shaderLocation: 3,
        }],
    };

    device.queue.writeBuffer(groundPositionBuffer, 0, flatten(positionsGround));
    device.queue.writeBuffer(groundIndicesBuffer, 0, indicesGround);
    device.queue.writeBuffer(groundTexcoordBuffer, 0, flatten(groundTexcoords));

    const filename = 'xamp23.png';
    const response = await fetch(filename);
    const blob = await response.blob();
    const img = await createImageBitmap(blob, { colorSpaceConversion: 'none' });

    const groundTexture = device.createTexture({
        size: [img.width, img.height, 1],
        format: "rgba8unorm",
        usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });
    device.queue.copyExternalImageToTexture(
        { source: img, flipY: true },
        { texture: groundTexture },
        { width: img.width, height: img.height },
    );

    groundTexture.sampler = device.createSampler({
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
        minFilter: 'linear',
        magFilter: 'linear',
    });

    const bgcolor = vec4(0.3921, 0.5843, 0.9294, 1.0) // Cornflower

    const groundUniformBuffer = device.createBuffer({
        size: sizeof['mat4'] * 2 + sizeof['vec4'] * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformBufferShadow = device.createBuffer({
        size: sizeof['mat4'] * 2 + sizeof['vec4'] * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const Mst = mat4(
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 0.5, 0.5,
        0.0, 0.0, 0.0, 1.0
    )

    const fov = 90;
    let projection = perspective(fov, canvas.width / canvas.height, 1, 20);
    projection = mult(Mst, projection);

    const wgslfile = document.getElementById('wgsl').src;
    const wgslcode
        = await fetch(wgslfile, { cache: "reload" }).then(r => r.text());
    const wgsl = device.createShaderModule({
        code: wgslcode
    });

    const msaaCount = 4;

    const groundPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: wgsl,
            entryPoint: 'main_vs_ground',
            buffers: [groundPositionBufferLayout, groundTexcoordBufferLayout],
        },
        fragment: {
            module: wgsl,
            entryPoint: 'main_fs_ground',
            targets: [{ format: canvasFormat }],
        },
        primitive: {
            topology: 'triangle-list',
            frontFace: 'ccw',
            cullMode: 'none',
        },
        multisample: { count: msaaCount },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
    });

    const teapotPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: wgsl,
            entryPoint: 'main_vs_teapot',
            buffers: [positionBufferLayout, teapotColorBufferLayout, teapotNormalBufferLayout],
        },
        fragment: {
            module: wgsl,
            entryPoint: 'main_fs_teapot',
            targets: [{ format: canvasFormat }],
        },
        primitive: {
            topology: 'triangle-list',
            frontFace: 'ccw',
            cullMode: 'none',
        },
        multisample: { count: msaaCount },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
    });

    // Create another pipeline for shadow pass to change depth test
    const pipelineShadows = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: wgsl,
            entryPoint: 'main_vs_ground',
            buffers: [positionBufferLayout, groundTexcoordBufferLayout],
        },
        fragment: {
            module: wgsl,
            entryPoint: 'main_fs_ground',
            targets: [{ format: canvasFormat }],
        },
        primitive: {
            topology: 'triangle-list',
            frontFace: 'ccw',
            cullMode: 'none', // No culling to see shadows on ground on both sides
        },
        multisample: { count: msaaCount },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'greater',
            format: 'depth24plus',
        },
    });

    const msaaTexture = device.createTexture({
        size: { width: canvas.width, height: canvas.height },
        format: canvasFormat,
        sampleCount: msaaCount,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const depthTexture = device.createTexture({
        size: { width: canvas.width, height: canvas.height },
        format: 'depth24plus',
        sampleCount: msaaCount,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // Different bind groups for ground and objects to use different textures
    const groundBindGroup = device.createBindGroup({
        layout: groundPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: groundUniformBuffer } },
            { binding: 1, resource: groundTexture.sampler },
            { binding: 2, resource: groundTexture.createView() },
        ],
    });

    const teapotBindGroup = device.createBindGroup({
        layout: teapotPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: teapotUniformBuffer } },
        ],
    });

    const bindGroupShadows = device.createBindGroup({
        layout: pipelineShadows.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBufferShadow } },
            { binding: 1, resource: groundTexture.sampler },
            { binding: 2, resource: groundTexture.createView() },
        ],
    });

    let lightAngle = 45;
    const lightRadius = 2.0;
    let lightPos = vec3(lightRadius * Math.sin(lightAngle), 2, -2 + lightRadius * Math.cos(lightAngle));

    function computeShadowMatrix(V, M) {
        const epsilon = 0.0001;
        const l = lightPos;
        const n = vec3(0, 1, 0);
        const d = 1.0 + epsilon;

        const a = d + dot(n, l);
        const Mshadow = mat4(
            a - l[0] * n[0], -l[0] * n[1], -l[0] * n[2], -l[0] * d,
            -l[1] * n[0], a - l[1] * n[1], -l[1] * n[2], -l[1] * d,
            -l[2] * n[0], -l[2] * n[1], a - l[2] * n[2], -l[2] * d,
            -n[0], -n[1], -n[2], a - d
        );

        const mvpShadow = mult(projection, mult(V, mult(Mshadow, M)));
        return mvpShadow;
    }

    function updateUniforms() {
        //TODO: Update eye point based on forward movement
        const eye = vec3(0, 0, 0);
        const up = vec3(0, 1, 0);

        // Update view matrix based on orientation
        const rotationMatrix = rotateY(-orientation.side);
        const lookAtPoint = mult(rotationMatrix, vec4(0, 0, -1, 0));
        const V = lookAt(eye, vec3(lookAtPoint[0], lookAtPoint[1], lookAtPoint[2]), up);

        const mvpGround = mult(projection, mult(V, mat4()));

        let teapotY = -0.5;
        let mTeapot = mult(translate(0, teapotY, -3), scalem(0.25, 0.25, 0.25));
        let mvpTeapot = mult(projection, mult(V, mTeapot));

        const mvpShadow = computeShadowMatrix(V, mTeapot);

        const options = getOptions();

        device.queue.writeBuffer(groundUniformBuffer, 0, flatten(mvpGround));
        device.queue.writeBuffer(groundUniformBuffer, sizeof['mat4'] * 2, new Float32Array([0.0, 0.0, 0.0, 1.0])); // eye, visibility

        const teapotUniforms = new Float32Array([
            ...flatten(eye), 1.0,
            ...flatten(lightPos), options.emittedRadianceSlider,
            options.ambientRadianceSlider, options.diffuseSlider, options.specularSlider, options.shininessSlider,
        ]);

        device.queue.writeBuffer(teapotUniformBuffer, 0, flatten(mvpTeapot));
        device.queue.writeBuffer(teapotUniformBuffer, sizeof['mat4'], flatten(mTeapot));
        device.queue.writeBuffer(teapotUniformBuffer, sizeof['mat4'] * 2, teapotUniforms);

        device.queue.writeBuffer(uniformBufferShadow, 0, flatten(mvpShadow));
        device.queue.writeBuffer(uniformBufferShadow, sizeof['mat4'] * 2, new Float32Array([0.0, 0.0, 0.0, 0.0]));
    }

    function animate(timestamp) {
        // lastTime = timestamp;
        updateUniforms();
        console.log("render");
        render();
        requestAnimationFrame(animate);
    }

    function render() {
        console.log("Render frame");

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: msaaTexture.createView(),
                resolveTarget: context.getCurrentTexture().createView(),
                loadOp: 'clear',
                storeOp: 'store',
                clearValue: { r: bgcolor[0], g: bgcolor[1], b: bgcolor[2], a: bgcolor[3] },
            }],
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthLoadOp: "clear",
                depthClearValue: 1.0,
                depthStoreOp: "store",
            }
        });

        pass.setPipeline(groundPipeline);
        pass.setIndexBuffer(groundIndicesBuffer, 'uint32');
        pass.setVertexBuffer(0, groundPositionBuffer);
        pass.setVertexBuffer(1, groundTexcoordBuffer);

        // Draw ground
        pass.setBindGroup(0, groundBindGroup);
        pass.drawIndexed(6);

        // Draw shadows
        pass.setPipeline(pipelineShadows);
        pass.setIndexBuffer(teapotIndicesBuffer, 'uint32');
        pass.setVertexBuffer(0, teapotPositionBuffer);
        pass.setBindGroup(0, bindGroupShadows);
        pass.drawIndexed(teapotIndices.length);

        // Draw teapot
        pass.setPipeline(teapotPipeline);
        pass.setVertexBuffer(1, teapotColorBuffer);
        pass.setVertexBuffer(2, teapotNormalBuffer);
        pass.setBindGroup(0, teapotBindGroup);
        pass.drawIndexed(teapotIndices.length);

        pass.end();
        device.queue.submit([encoder.finish()]);
    }

    // Start render loop
    requestAnimationFrame(animate);
}

window.onload = function () { main(); }