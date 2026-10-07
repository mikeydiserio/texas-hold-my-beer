import { Color, ShaderMaterial, Vector3 } from 'three';

/**
 * Screenprinted silhouette shading: a flat ink body, a halftone dot screen where table light falls
 * (dots are sized in screen space, like a print plate), and a hard-edged rim so dark figures read
 * against a dark room. Works for meshes and InstancedMesh (instanceColor tints the rim per instance).
 * Figures beyond `uFade` sink into the dark.
 */
const vertexShader=`
varying vec3 vNormal; varying vec3 vView; varying vec3 vWorldNormal; varying vec3 vWorld; varying vec3 vTint;
void main(){
  vec4 local=vec4(position,1.);vec3 n=normal;
  #ifdef USE_INSTANCING
  local=instanceMatrix*local;n=mat3(instanceMatrix)*n;
  #endif
  #ifdef USE_INSTANCING_COLOR
  vTint=instanceColor;
  #else
  vTint=vec3(1.);
  #endif
  vec4 world=modelMatrix*local;vec4 mv=viewMatrix*world;
  vWorld=world.xyz;vWorldNormal=normalize(mat3(modelMatrix)*n);vNormal=normalize((viewMatrix*vec4(vWorldNormal,0.)).xyz);vView=normalize(-mv.xyz);
  gl_Position=projectionMatrix*mv;
}`;
const fragmentShader=`
uniform vec3 uBase; uniform vec3 uTone; uniform float uToneStrength; uniform vec3 uRim; uniform float uRimStrength; uniform vec3 uFocus; uniform vec2 uFade; uniform float uOpacity; uniform float uPower; uniform float uDot;
varying vec3 vNormal; varying vec3 vView; varying vec3 vWorldNormal; varying vec3 vWorld; varying vec3 vTint;
void main(){
  vec3 n=normalize(vWorldNormal);
  float fresnel=pow(1.-clamp(dot(normalize(vNormal),normalize(vView)),0.,1.),uPower);
  float light=clamp(clamp(dot(n,normalize(uFocus-vWorld)),0.,1.)*.85+clamp(n.y,0.,1.)*.25-.45,0.,1.)/.55;
  // 45-degree dot screen: dot radius grows with the light, so shading prints as halftone instead of a gradient.
  vec2 cell=mat2(.7071,-.7071,.7071,.7071)*gl_FragCoord.xy/uDot;
  float d=length(fract(cell)-.5),r=light*.5,aa=fwidth(d);
  float dots=1.-smoothstep(r-aa,r+aa,d);
  vec3 col=mix(uBase,uTone,dots*uToneStrength);
  // Hard-edged rim: strength widens the band and brings it to full ink.
  float edge=1.-clamp(uRimStrength*.42,.04,.62);
  float rim=smoothstep(edge-.03,edge+.03,fresnel)*clamp(uRimStrength*1.5,0.,1.);
  col=mix(col,uRim*vTint,rim);
  col*=mix(1.,.3,smoothstep(uFade.x,uFade.y,length(vWorld.xz*vec2(.72,1.))));
  gl_FragColor=vec4(col,uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
export interface SilhouetteOptions { rim?:string; rimStrength?:number; base?:string; tone?:string; toneStrength?:number; fade?:[number,number]; power?:number; dot?:number; }
export function silhouetteMaterial({rim='#f3edda',rimStrength=.6,base='#141316',tone='#e83235',toneStrength=.85,fade=[60,80],power=2.4,dot=5}:SilhouetteOptions={}){
  return new ShaderMaterial({
    vertexShader,fragmentShader,
    uniforms:{uBase:{value:new Color(base)},uTone:{value:new Color(tone)},uToneStrength:{value:toneStrength},uRim:{value:new Color(rim)},uRimStrength:{value:rimStrength},uFocus:{value:new Vector3(0,.4,0)},uFade:{value:fade},uOpacity:{value:1},uPower:{value:power},uDot:{value:dot*(typeof window==='undefined'?1:Math.min(window.devicePixelRatio,1.6))}},
  });
}
