'use strict';

window.onload = function () {
  main();
};

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

  const wgslfile = document.getElementById('wgsl').src;
  const wgslcode = await fetch(wgslfile, { cache: 'reload' }).then((r) =>
    r.text()
  );
  const wgsl = device.createShaderModule({
    code: wgslcode,
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

  // window.addEventListener('deviceorientationabsolute', (event) => {
  //   console.log('absolute', event);
  //   document.getElementById('orientation-text').textContent = `alpha: ${event.alpha?.toFixed(2)}, beta: ${event.beta?.toFixed(2)}, gamma: ${event.gamma?.toFixed(2)}`;
  // });

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

  // Render Pipeline
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: wgsl,
      entryPoint: 'vertex_main',
    },
    fragment: {
      module: wgsl,
      entryPoint: 'fragment_main',
      targets: [
        {
          format: canvasFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  // Temp orientation test function to change background color based on orientation
  function getBackgroundColor() {
    const r = (orientation.front + 90) / 180; // Front controls red - Normalize to [0,1]
    const g = (orientation.side + 180) / 360;   // Side controls green - Normalize to [0,1]
    const b = 0.5; // Fixed blue component
    const a = 1.0; // Fully opaque

    const bgColor = { r: r, g: g, b: b, a: a };
    return bgColor;
  }

  // Render function
  function render() {
    const bgColor = getBackgroundColor();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: 'clear',
          clearValue: bgColor, // solid background
          storeOp: 'store',
        },
      ],
    });

    pass.setPipeline(pipeline);
    pass.draw(3); // Draw 3 vertices (a triangle)
    pass.end();

    device.queue.submit([encoder.finish()]);

    requestAnimationFrame(render);
  }

  render();
}
