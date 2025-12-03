# Debugging locally
Based on this guide: https://developer.chrome.com/docs/web-platform/webgpu/troubleshooting-tips

WebGPU is only enabled for secure sources. Therefore if hosting on another device than the phone,
and connecting over HTTP, WebGPU will not work.

Can add the local IP-address of the host (i.e. laptop) to [`chrome://flags/#unsafely-treat-insecure-origin-as-secure`](chrome://flags/#unsafely-treat-insecure-origin-as-secure) to let WebGPU be enabled for the insecure host.
