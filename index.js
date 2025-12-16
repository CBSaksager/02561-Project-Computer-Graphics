"use strict";

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

    // Segway movement
    function orientationToSpeed(orientation) {
        const deadzone = 15;
        const maxSpeedAngle = 45;
        let forward = 0;
        if (Math.abs(orientation.front) > deadzone) {
            // Map orientation angle to speed -1 to 1 based on percentage between deadzone and maxSpeedAngle
            forward = -(orientation.front - Math.sign(orientation.front) * deadzone) / (maxSpeedAngle - deadzone);
        }
        return forward;
    }

    // Device orientation
    window.addEventListener('deviceorientation', handleOrientation);
    function handleOrientation(event) {
        const { alpha, beta, gamma } = event;
        const { forward, right, up } = getEulerAngles(getRotationMatrix(alpha, beta, gamma));

        let text = `alpha: ${event.alpha?.toFixed(2)}, beta: ${event.beta?.toFixed(2)}, gamma: ${event.gamma?.toFixed(2)}`;
        text += ` \nforward: ${forward.toFixed(2)}, side: ${right.toFixed(2)}, up: ${up.toFixed(2)}`;
        document.getElementById('orientation-text').textContent = text;

        orientation.front = right;
        orientation.side = up;
    }

    // Keyboard controls
    const keys = {
        ArrowUp: false,
        ArrowDown: false
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    function handleKeyDown(event) {
        const step = 5; // degrees per key press

        switch (event.key) {
            case 'ArrowUp':
                keys.ArrowUp = true;
                break;
            case 'ArrowDown':
                keys.ArrowDown = true;
                break;
            case 'ArrowLeft':
                orientation.side += step;
                break;
            case 'ArrowRight':
                orientation.side -= step;
                break;
        }
        updateForwardMovement();
    }

    function handleKeyUp(event) {
        switch (event.key) {
            case 'ArrowUp':
                keys.ArrowUp = false;
                break;
            case 'ArrowDown':
                keys.ArrowDown = false;
                break;
        }
        updateForwardMovement();
    }

    function updateForwardMovement() {
        const keyboardSpeed = 25;

        if (keys.ArrowUp && !keys.ArrowDown) {
            orientation.front = -keyboardSpeed;
        } else if (!keys.ArrowUp && keys.ArrowDown) {
            orientation.front = keyboardSpeed;
        } else {
            orientation.front = 0;
        }
    }

    const positionBufferLayout = {
        arrayStride: sizeof['vec4'],
        attributes: [{
            format: 'float32x4',
            offset: 0,
            shaderLocation: 0,
        }],
    };

    // MAZE GENERATION
    function generateMaze(width, height) {
        const maze = Array(height).fill().map(() => Array(width).fill(1)); // 1 = wall

        function carve(x, y) {
            maze[y][x] = 0; // 0 = path

            const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]].sort(() => Math.random() - 0.5);

            for (const [dx, dy] of dirs) {
                const nx = x + dx * 2;
                const ny = y + dy * 2;

                if (nx >= 0 && nx < width && ny >= 0 && ny < height && maze[ny][nx] === 1) {
                    maze[y + dy][x + dx] = 0; // Carve between
                    carve(nx, ny);
                }
            }
        }

        carve(1, 1); // Starting cell
        return maze;
    }

    function addWallBox(vertices, indices, normals, colors, texcoords, x, y, z, w, h, d) {
        const baseIndex = vertices.length;

        // Front face (z = z)
        vertices.push(vec4(x, y, z, 1), vec4(x + w, y, z, 1), vec4(x + w, y + h, z, 1), vec4(x, y + h, z, 1));
        texcoords.push(vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 1));

        // Back face (z = z + d)
        vertices.push(vec4(x + w, y, z + d, 1), vec4(x, y, z + d, 1), vec4(x, y + h, z + d, 1), vec4(x + w, y + h, z + d, 1));
        texcoords.push(vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 1));

        // Right face (x = x + w)
        vertices.push(vec4(x + w, y, z, 1), vec4(x + w, y, z + d, 1), vec4(x + w, y + h, z + d, 1), vec4(x + w, y + h, z, 1));
        texcoords.push(vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 1));

        // Left face (x = x)
        vertices.push(vec4(x, y, z + d, 1), vec4(x, y, z, 1), vec4(x, y + h, z, 1), vec4(x, y + h, z + d, 1));
        texcoords.push(vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 1));

        // Top face (y = y + h)
        vertices.push(vec4(x, y + h, z, 1), vec4(x + w, y + h, z, 1), vec4(x + w, y + h, z + d, 1), vec4(x, y + h, z + d, 1));
        texcoords.push(vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 1));

        // Bottom face (y = y)
        vertices.push(vec4(x, y, z + d, 1), vec4(x + w, y, z + d, 1), vec4(x + w, y, z, 1), vec4(x, y, z, 1));
        texcoords.push(vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 1));

        // Indices for 6 faces (2 triangles per face)
        const faceIndices = [
            0, 1, 2, 0, 2, 3,       // Front
            4, 5, 6, 4, 6, 7,       // Back
            8, 9, 10, 8, 10, 11,    // Right
            12, 13, 14, 12, 14, 15, // Left
            16, 17, 18, 16, 18, 19, // Top
            20, 21, 22, 20, 22, 23  // Bottom
        ];

        for (const idx of faceIndices) {
            indices.push(baseIndex + idx);
        }

        // Add colors and normals for all 24 vertices
        for (let i = 0; i < 24; i++) {
            colors.push(vec4(1.0, 1.0, 1.0, 1.0));
            // Normals (approximate per face)
            if (i < 4) normals.push(vec4(0, 0, -1, 0));          // Front
            else if (i < 8) normals.push(vec4(0, 0, 1, 0));      // Back
            else if (i < 12) normals.push(vec4(1, 0, 0, 0));     // Right
            else if (i < 16) normals.push(vec4(-1, 0, 0, 0));    // Left
            else if (i < 20) normals.push(vec4(0, 1, 0, 0));     // Top
            else normals.push(vec4(0, -1, 0, 0));                // Bottom
        }
    }

    function generateMazeGeometry(maze, cellSize, wallHeight) {
        const vertices = [];
        const indices = [];
        const normals = [];
        const colors = [];
        const texcoords = [];

        for (let y = 0; y < maze.length; y++) {
            for (let x = 0; x < maze[y].length; x++) {
                if (maze[y][x] === 1) { // Wall
                    addWallBox(vertices, indices, normals, colors, texcoords,
                        x * cellSize, 0, y * cellSize,
                        cellSize, wallHeight, cellSize);
                }
            }
        }

        return { vertices, indices, normals, colors, texcoords };
    }

    // Grid-based collision detection
    const cellSize = 1;
    const maze = generateMaze(21, 21);

    function checkMazeCollision(position, radius) {
        const gridX = Math.floor(position[0] / cellSize);
        const gridZ = Math.floor(position[2] / cellSize);

        // Check nearby cells
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const cx = gridX + dx;
                const cy = gridZ + dy;

                if (cx >= 0 && cx < maze[0].length && cy >= 0 && cy < maze.length) {
                    if (maze[cy][cx] === 1) { // Wall
                        const cellX = cx * cellSize;
                        const cellZ = cy * cellSize;

                        const closestX = Math.max(cellX, Math.min(position[0], cellX + cellSize));
                        const closestZ = Math.max(cellZ, Math.min(position[2], cellZ + cellSize));

                        const distX = position[0] - closestX;
                        const distZ = position[2] - closestZ;
                        const distSq = distX * distX + distZ * distZ;

                        if (distSq < radius * radius) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    // Generate maze geometry
    const mazeGeometry = generateMazeGeometry(maze, cellSize, 2.0);

    // MAZE
    const mazePositionBuffer = device.createBuffer({
        size: sizeof['vec4'] * mazeGeometry.vertices.length,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(mazePositionBuffer, 0, flatten(mazeGeometry.vertices));

    const mazeNormalBuffer = device.createBuffer({
        size: sizeof['vec4'] * mazeGeometry.normals.length,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    const normalBufferLayout = {
        arrayStride: sizeof['vec4'],
        attributes: [{
            format: 'float32x4',
            offset: 0,
            shaderLocation: 2,
        }],
    };
    device.queue.writeBuffer(mazeNormalBuffer, 0, flatten(mazeGeometry.normals));

    const mazeIndicesBuffer = device.createBuffer({
        size: Uint32Array.BYTES_PER_ELEMENT * mazeGeometry.indices.length,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(mazeIndicesBuffer, 0, new Uint32Array(mazeGeometry.indices));

    const mazeUniformBuffer = device.createBuffer({
        size: sizeof['mat4'] * 2 + sizeof['vec4'] * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const mazeTexcoordBuffer = device.createBuffer({
        size: sizeof['vec2'] * mazeGeometry.texcoords.length,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(mazeTexcoordBuffer, 0, flatten(mazeGeometry.texcoords));

    const texcoordBufferLayout = {
        arrayStride: sizeof['vec2'],
        attributes: [{
            format: 'float32x2',
            offset: 0,
            shaderLocation: 1,
        }],
    };

    // GROUND
    let positionsGround = [
        vec3(0, -0.01, 0),
        vec3(21, -0.01, 0),
        vec3(21, -0.01, 21),
        vec3(0, -0.01, 21),
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
        vec2(21.0, 0.0),
        vec2(21.0, 21.0),
        vec2(0.0, 21.0),
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
            shaderLocation: 1,
        }],
    };

    const groundNormals = [
        vec4(0, 1, 0, 0),
        vec4(0, 1, 0, 0),
        vec4(0, 1, 0, 0),
        vec4(0, 1, 0, 0),
    ];
    const groundNormalBuffer = device.createBuffer({
        size: sizeof['vec4'] * groundNormals.length,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

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
        addressModeU: 'repeat',
        addressModeV: 'repeat',
        minFilter: 'linear',
        magFilter: 'linear',
    });

    const wallFilename = 'brick_wall_07_diff_4k.png';
    const wallResponse = await fetch(wallFilename);
    const wallBlob = await wallResponse.blob();
    const wallImg = await createImageBitmap(wallBlob, { colorSpaceConversion: 'none' });

    const wallTexture = device.createTexture({
        size: [wallImg.width, wallImg.height, 1],
        format: "rgba8unorm",
        usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });
    device.queue.copyExternalImageToTexture(
        { source: wallImg, flipY: true },
        { texture: wallTexture },
        { width: wallImg.width, height: wallImg.height },
    );

    wallTexture.sampler = device.createSampler({
        addressModeU: 'repeat',
        addressModeV: 'repeat',
        minFilter: 'linear',
        magFilter: 'linear',
    });

    const bgcolor = vec4(0, 0, 0, 1.0)

    const groundUniformBuffer = device.createBuffer({
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
    let projection = perspective(fov, canvas.width / canvas.height, 0.001, 50.0);
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
            entryPoint: 'main_vs_texture',
            buffers: [groundPositionBufferLayout, texcoordBufferLayout, normalBufferLayout],
        },
        fragment: {
            module: wgsl,
            entryPoint: 'main_fs_texture',
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

    const mazePipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: wgsl,
            entryPoint: 'main_vs_texture',
            buffers: [positionBufferLayout, texcoordBufferLayout, normalBufferLayout],
        },
        fragment: {
            module: wgsl,
            entryPoint: 'main_fs_texture',
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

    const mazeBindGroup = device.createBindGroup({
        layout: mazePipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: mazeUniformBuffer } },
            { binding: 1, resource: wallTexture.sampler },
            { binding: 2, resource: wallTexture.createView() },
        ],
    });

    let lightPos = vec3(10.5, 15, 10.5);

    let eye = vec3(1.5, 1, 1.5); // Start in cell (1,1)
    // let eye = vec3(10.5, 20, 10.5); // View maze from above
    const collisionRadius = 0.1;

    function updateUniforms() {
        const up = vec3(0, 1, 0);
        const forwardMovement = orientationToSpeed(orientation);

        // Update eye position based on orientation (maybe move this to a speedToPosition function)
        const angleRadians = -orientation.side * Math.PI / 180;
        const forwardX = Math.sin(angleRadians);
        const forwardZ = -Math.cos(angleRadians);
        const maxSpeed = 0.05; // units per frame
        const speed = forwardMovement * maxSpeed;

        const newEye = vec3(
            eye[0] + forwardX * speed,
            eye[1],
            eye[2] + forwardZ * speed
        );

        // Check collision before updating position
        if (!checkMazeCollision(newEye, collisionRadius)) {
            eye = newEye;
        }

        // Update view matrix based on orientation
        const rotationMatrix = rotateY(-orientation.side);
        const lookAtPoint = mult(rotationMatrix, vec4(0, 0, -1, 0));
        // const lookAtPoint = vec4(0, -50, 10, 0); // Look down on maze

        const V = lookAt(eye, vec3(eye[0] + lookAtPoint[0], eye[1] + lookAtPoint[1], eye[2] + lookAtPoint[2]), up);

        const mvpGround = mult(projection, mult(V, mat4()));

        const mMaze = mat4();
        let mvpMaze = mult(projection, mult(V, mMaze));
        const uniforms = new Float32Array([...flatten(eye)]);

        device.queue.writeBuffer(groundUniformBuffer, 0, flatten(mvpGround));
        device.queue.writeBuffer(groundUniformBuffer, sizeof['mat4'], flatten(mat4()));
        device.queue.writeBuffer(groundUniformBuffer, sizeof['mat4'] * 2, uniforms);


        device.queue.writeBuffer(mazeUniformBuffer, 0, flatten(mvpMaze));
        device.queue.writeBuffer(mazeUniformBuffer, sizeof['mat4'], flatten(mMaze));
        device.queue.writeBuffer(mazeUniformBuffer, sizeof['mat4'] * 2, uniforms);
    }

    function animate(_timestamp) {
        updateUniforms();
        render();
        requestAnimationFrame(animate);
    }

    function render() {
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
        pass.setVertexBuffer(2, groundNormalBuffer);

        // Draw ground
        pass.setBindGroup(0, groundBindGroup);
        pass.drawIndexed(6);

        // Draw maze
        pass.setPipeline(mazePipeline);
        pass.setIndexBuffer(mazeIndicesBuffer, 'uint32');
        pass.setVertexBuffer(0, mazePositionBuffer);
        pass.setVertexBuffer(1, mazeTexcoordBuffer);
        pass.setVertexBuffer(2, mazeNormalBuffer);
        pass.setBindGroup(0, mazeBindGroup);
        pass.drawIndexed(mazeGeometry.indices.length);

        pass.end();
        device.queue.submit([encoder.finish()]);
    }

    // Start render loop
    requestAnimationFrame(animate);
}

window.onload = function () { main(); }


// Converts DeviceOrientation angles to rotation matrix
// Based on snippet from https://w3c.github.io/deviceorientation/#example-76d62ad0
// Apapted based on https://stackoverflow.com/questions/69216465/the-simplest-way-to-solve-gimbal-lock-when-using-deviceorientation-events-in-jav
function getRotationMatrix(alpha, beta, gamma) {
    const degtorad = Math.PI / 180; // Degree-to-Radian conversion
    var cX = Math.cos(beta * degtorad);
    var cY = Math.cos(gamma * degtorad);
    var cZ = Math.cos(alpha * degtorad);
    var sX = Math.sin(beta * degtorad);
    var sY = Math.sin(gamma * degtorad);
    var sZ = Math.sin(alpha * degtorad);

    var m11 = cZ * cY - sZ * sX * sY;
    var m12 = - cX * sZ;
    var m13 = cY * sZ * sX + cZ * sY;

    var m21 = cY * sZ + cZ * sX * sY;
    var m22 = cZ * cX;
    var m23 = sZ * sY - cZ * cY * sX;

    var m31 = - cX * sY;
    var m32 = sX;
    var m33 = cX * cY;

    return [
        m13, m11, m12,
        m23, m21, m22,
        m33, m31, m32
    ];
};

// Converts rotation matrix to Euler angles
// Based on https://learnopencv.com/rotation-matrix-to-euler-angles/
// Apapted based on https://stackoverflow.com/questions/69216465/the-simplest-way-to-solve-gimbal-lock-when-using-deviceorientation-events-in-jav
function getEulerAngles(matrix) {
    var radtodeg = 180 / Math.PI; // Radian-to-Degree conversion
    var sy = Math.sqrt(matrix[0] * matrix[0] + matrix[3] * matrix[3]);

    var singular = sy < 1e-6; // If

    if (!singular) {
        var x = Math.atan2(matrix[7], matrix[8]);
        var y = Math.atan2(-matrix[6], sy);
        var z = Math.atan2(matrix[3], matrix[0]);
    } else {
        var x = Math.atan2(-matrix[5], matrix[4]);
        var y = Math.atan2(-matrix[6], sy);
        var z = 0;
    }
    return {
        forward: radtodeg * x,
        right: radtodeg * y,
        up: radtodeg * z
    };
}