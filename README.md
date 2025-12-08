# Notes
https://web.dev/articles/device-orientation#earth_coordinate_frame

# Debugging locally
Based on this guide: https://developer.chrome.com/docs/web-platform/webgpu/troubleshooting-tips

WebGPU is only enabled for secure sources. Therefore if hosting on another device than the phone, and connecting over HTTP, WebGPU will not work.
A workaround is to add local IP-address of the host to [chrome://flags/#unsafely-treat-insecure-origin-as-secure](chrome://flags/#unsafely-treat-insecure-origin-as-secure).

This allows WebGPU to run without `https`.

To get access to the Chrome DevTools on a phone, enable Developer Options on the phone along with USB Debugging.
Connect the phone to computer and use [chrome://inspect/#devices](chrome://inspect/#devices) to debug.
