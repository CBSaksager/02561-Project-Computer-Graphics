# 02561 Computer Graphics: Project
Title: **Using device orientation for real-time input with WebGPU**

Group members:
- **Mads Christian Wrang Nielsen: s224784**
- **Christian Brix Saksager: s224777**

![a screenshot showcasing the maze with fog](./img/maze-screenshot)

A browser and WebGPU rendered game showcasing how the web Device Orientation API can be utilized to make immersive controls for mobile applications.

# Debugging / Running locally
Based on this guide: https://developer.chrome.com/docs/web-platform/webgpu/troubleshooting-tips

WebGPU is only enabled for secure sources. Therefore if hosting on another device than the phone, and connecting over HTTP, WebGPU will not work.
A workaround is to add local IP-address of the host to [chrome://flags/#unsafely-treat-insecure-origin-as-secure](chrome://flags/#unsafely-treat-insecure-origin-as-secure).

This allows WebGPU to run without `https`.

To get access to the Chrome DevTools on a phone, enable Developer Options on the phone along with USB Debugging.
Connect the phone to computer and use [chrome://inspect/#devices](chrome://inspect/#devices) to debug.

The application have only been tested on Android with Google Chrome. On iOS permission to use the device orientation needs to be requested. This has not been implemented.
