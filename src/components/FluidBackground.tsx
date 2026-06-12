import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

const simplexNoise3D = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0) * 289.0); }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const fullscreenVert = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const initFragmentShader = `
precision highp float;
uniform vec2 u_resolution;
uniform float uAspectRatio;

${simplexNoise3D}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv;
  float aspectRatio = u_resolution.x / u_resolution.y;
  float noise = snoise(vec3(p.x * aspectRatio * 3.0, p.y * 3.0, 0.0));
  noise = noise * 0.5 + 0.5;
  float color = noise > 0.5 ? 1.0 : 0.0;
  gl_FragColor = vec4(vec3(color), 1.0);
}
`;

const feedbackFragmentShader = `
precision highp float;
uniform sampler2D uDiffuse;
uniform float uAspectRatio;
uniform vec2 uResolution;
uniform float uFrameCount;
uniform float uTime;
uniform float uSpeed;
uniform float uTrailLength;
uniform float uRotating;

${simplexNoise3D}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = uv;
  float aspectRatio = uResolution.x / uResolution.y;

  float speed = uSpeed * 0.0001;
  float t = uTime * speed + uFrameCount * 0.001;
  vec3 noise_uv = vec3(p.x * 1.5, p.y * 1.5, t * 20.0);
  float noise = snoise(noise_uv);
  vec2 distort_uv = vec2(aspectRatio * cos(noise * 3.14159265), sin(noise * 3.14159265)) * 0.04;
  distort_uv *= uTrailLength;

  float rot = speed * 300.0;
  mat2 rotMat = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));

  p += distort_uv;
  p = rotMat * (p - 0.5) + 0.5;
  p += speed * 0.2;

  vec4 color = texture2D(uDiffuse, p);
  color.a = 1.0;
  gl_FragColor = color;
}
`;

const displayFragmentShader = `
precision highp float;
uniform sampler2D uDiffuse;
uniform float uAspectRatio;
uniform vec2 uResolution;
uniform float uTime;
uniform float uGrainAmp;
uniform float uGrainScale;
uniform float uNoiseIntensity;
uniform float uIntensity;
uniform float uSoftness;
uniform vec3 uBgColor;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;

${simplexNoise3D}

float random(vec2 co) {
  return fract(sin(mod(dot(co, vec2(12.9898, 78.233)), 3.14)) * 43758.5453);
}

float grain(vec2 texCoord, vec2 uv) {
  float speed = 0.0001;
  float noise = random(texCoord + fract(uTime * speed) + fract(uTime * 0.001));
  noise = noise * 2.0 - 1.0;
  return noise * uv.x * uv.y;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec4 fluid = texture2D(uDiffuse, uv);
  float height = fluid.r;
  float aspectRatio = uResolution.x / uResolution.y;
  vec3 noise_uv = vec3(uv.x * aspectRatio * uGrainScale, uv.y * uGrainScale, uTime * 0.0001);

  float t = clamp((height + snoise(noise_uv) * uNoiseIntensity) * uIntensity, 0.0, 1.0);
  t = smoothstep(0.0, uSoftness, t);

  vec3 color1 = uColor1 * vec3(1.2, 1.1, 1.1);
  vec3 color2 = uColor2 * 1.0;
  vec3 color3 = uColor3 * 1.0;
  vec3 color4 = uColor4 * vec3(1.5, 1.4, 1.4);

  vec3 color = mix(color1, color2, smoothstep(0.0, 0.3, t));
  color = mix(color, color3, smoothstep(0.3, 0.6, t));
  color = mix(color, color4, smoothstep(0.6, 1.0, t));

  vec2 grain_uv = vec2(grain(gl_FragCoord.xy, uv));
  float grain_amp = grain_uv.x * uGrainAmp;
  vec3 col_grain = color * (1.0 + grain_amp);

  vec3 col = mix(uBgColor, col_grain, t);
  gl_FragColor = vec4(col, 1.0);
}
`;

const quadGeo = new THREE.PlaneGeometry(2, 2);

const rtCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
rtCamera.position.set(0, 0, 2);
rtCamera.updateProjectionMatrix();

function FluidScene({ isTransferring }: { isTransferring: boolean }) {
  const frameCountRef = useRef(0);
  const { gl, size } = useThree();

  const speedRef = useRef(1.0);
  const trailLengthRef = useRef(1.0);

  const rtRef = useRef<{
    targets: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
    initQuad: THREE.Mesh;
    feedbackQuad: THREE.Mesh;
    displayQuad: THREE.Mesh;
    rtScene: THREE.Scene;
  } | null>(null);

  const setup = useMemo(() => {
    const w = Math.max(size.width, 1);
    const h = Math.max(size.height, 1);
    const rtOptions: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    };

    const rtA = new THREE.WebGLRenderTarget(w, h, rtOptions);
    const rtB = new THREE.WebGLRenderTarget(w, h, rtOptions);

    const initMat = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: initFragmentShader,
      uniforms: {
        u_resolution: { value: new THREE.Vector2(w, h) },
        uAspectRatio: { value: w / Math.max(h, 1) },
      },
    });

    const feedbackMat = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: feedbackFragmentShader,
      uniforms: {
        uDiffuse: { value: null },
        uAspectRatio: { value: w / Math.max(h, 1) },
        uResolution: { value: new THREE.Vector2(w, h) },
        uFrameCount: { value: 0 },
        uTime: { value: 0 },
        uSpeed: { value: 1.0 },
        uTrailLength: { value: 1.0 },
        uRotating: { value: 1.0 },
      },
    });

    const displayMat = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: displayFragmentShader,
      uniforms: {
        uDiffuse: { value: null },
        uAspectRatio: { value: w / Math.max(h, 1) },
        uResolution: { value: new THREE.Vector2(w, h) },
        uTime: { value: 0 },
        uGrainAmp: { value: 0.05 },
        uGrainScale: { value: 400.0 },
        uNoiseIntensity: { value: 1.0 },
        uIntensity: { value: 1.0 },
        uSoftness: { value: 1.0 },
        uBgColor: { value: new THREE.Color(0.02, 0.04, 0.08) },
        uColor1: { value: new THREE.Color(0.1, 0.2, 0.4) },
        uColor2: { value: new THREE.Color(0.2, 0.4, 0.8) },
        uColor3: { value: new THREE.Color(0.4, 0.7, 1.0) },
        uColor4: { value: new THREE.Color(1.0, 1.0, 1.0) },
      },
    });

    const initQuad = new THREE.Mesh(quadGeo, initMat);
    const feedbackQuad = new THREE.Mesh(quadGeo, feedbackMat);
    const displayQuad = new THREE.Mesh(quadGeo, displayMat);

    const rtScene = new THREE.Scene();
    rtScene.add(initQuad);

    return {
      targets: [rtA, rtB] as [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget],
      initQuad,
      feedbackQuad,
      displayQuad,
      rtScene,
      initMat,
      feedbackMat,
      displayMat,
    };
  }, []);

  useEffect(() => {
    rtRef.current = {
      targets: setup.targets,
      initQuad: setup.initQuad,
      feedbackQuad: setup.feedbackQuad,
      displayQuad: setup.displayQuad,
      rtScene: setup.rtScene,
    };

    return () => {
      setup.targets[0].dispose();
      setup.targets[1].dispose();
      setup.initMat.dispose();
      setup.feedbackMat.dispose();
      setup.displayMat.dispose();
      quadGeo.dispose();
    };
  }, [setup]);

  useFrame(({ clock }) => {
    if (!rtRef.current) return;

    const time = clock.elapsedTime;
    const fc = frameCountRef.current;
    const rt = rtRef.current;
    const [readRT, writeRT] = rt.targets;

    const targetSpeed = isTransferring ? 0.2 : 1.0;
    const targetTrail = isTransferring ? 1.5 : 1.0;
    speedRef.current += (targetSpeed - speedRef.current) * 0.05;
    trailLengthRef.current += (targetTrail - trailLengthRef.current) * 0.05;

    gl.autoClear = false;

    if (fc < 2) {
      const initMat = rt.initQuad.material as THREE.ShaderMaterial;
      initMat.uniforms.u_resolution.value.set(size.width, size.height);
      rt.rtScene.add(rt.initQuad);
      if (rt.feedbackQuad.parent) rt.rtScene.remove(rt.feedbackQuad);
      gl.setRenderTarget(writeRT);
      gl.clear();
      gl.render(rt.rtScene, rtCamera);
    } else {
      const fbMat = rt.feedbackQuad.material as THREE.ShaderMaterial;
      fbMat.uniforms.uDiffuse.value = readRT.texture;
      fbMat.uniforms.uResolution.value.set(size.width, size.height);
      fbMat.uniforms.uFrameCount.value = Math.min(fc, 100000);
      fbMat.uniforms.uTime.value = time;
      fbMat.uniforms.uSpeed.value = speedRef.current;
      fbMat.uniforms.uTrailLength.value = trailLengthRef.current;
      rt.rtScene.add(rt.feedbackQuad);
      if (rt.initQuad.parent) rt.rtScene.remove(rt.initQuad);
      gl.setRenderTarget(writeRT);
      gl.clear();
      gl.render(rt.rtScene, rtCamera);
    }

    const dispMat = rt.displayQuad.material as THREE.ShaderMaterial;
    dispMat.uniforms.uDiffuse.value = writeRT.texture;
    dispMat.uniforms.uResolution.value.set(size.width, size.height);
    dispMat.uniforms.uTime.value = time;
    dispMat.uniforms.uSoftness.value = isTransferring ? 0.9 : 1.0;

    rt.targets[0] = writeRT;
    rt.targets[1] = readRT;
    frameCountRef.current++;
  });

  return (
    <primitive object={setup.displayQuad} />
  );
}

export default function FluidBackground({ isTransferring }: { isTransferring: boolean }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <Canvas
        gl={{
          antialias: false,
          alpha: false,
          preserveDrawingBuffer: false,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [0, 0, 2], near: 0.1, far: 10 }}
        style={{ width: '100%', height: '100%' }}
        dpr={[1, 1.5]}
        frameloop="always"
      >
        <FluidScene isTransferring={isTransferring} />
        <EffectComposer>
          <Bloom
            intensity={0.2}
            luminanceThreshold={0.5}
            luminanceSmoothing={0.1}
            radius={0.1}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
