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


  // Temp background color
  const bgColor = { r: 0.7, g: 0.3, b: 0.0, a: 1.0 };
  // Render function
  function render() {
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
  }

  render();
}
