// Types voor het deel van @ybouane/liquidglass dat we gebruiken (zie liquidglass.js).
export interface GlassConfig {
  blurAmount: number;
  refraction: number;
  chromAberration: number;
  edgeHighlight: number;
  specular: number;
  fresnel: number;
  distortion: number;
  cornerRadius: number;
  zRadius: number;
  opacity: number;
  saturation: number;
  tintStrength: number;
  brightness: number;
  shadowOpacity: number;
  shadowSpread: number;
  shadowOffsetY: number;
  floating: boolean;
  button: boolean;
  bevelMode: 0 | 1;
}

export declare class LiquidGlass {
  static init(options: { root: HTMLElement; glassElements?: HTMLElement[]; defaults?: Partial<GlassConfig> }): Promise<LiquidGlass>;
  fps: number;
  destroy(): void;
  markChanged(element?: HTMLElement): void;
}
