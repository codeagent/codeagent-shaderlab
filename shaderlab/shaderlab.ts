export enum PropertyType {
  Range = "Range",
  Float = "Float",
  Int = "Int",
  Color = "Color",
  Vector = "Vector",
  Texture2D = "2D",
  TextureCube = "Cube",
  Texture3D = "3D"
}

export enum FilterMode {
  Nearest = "Nearest",
  Linear = "Linear"
}

export enum AddressMode {
  Repeat = "Repeat",
  Mirror = "Mirror",
  Edge = "Edge"
}

export class Sampler {
  filtering: FilterMode;
  address: AddressMode;
  mipmaps: boolean;
  compare: CompareMode;
}

export class Property {
  name: string;
  displayName: string;
  type: PropertyType;
  value: number | string | number[];
  rangeMin?: number;
  rangeMax?: number;
  sampler?: Sampler;
}

export interface Tags {
  [name: string]: string;
}

export enum CullMode {
  Back = "Back",
  Front = "Front",
  Off = "Off"
}

export enum CompareMode {
  Greater = "Greater",
  GEqual = "GEqual",
  Less = "Less",
  LEqual = "LEqual",
  Equal = "Equal",
  NotEqual = "NotEqual",
  Always = "Always",
  Never = "Never"
}

export enum BlendCommand {
  Add = "Add",
  Sub = "Sub",
  RevSub = "RevSub",
  Min = "Min",
  Max = "Max"
}

export enum BlendFunc {
  One = "One",
  Zero = "Zero",
  SrcColor = "SrcColor",
  SrcAlpha = "SrcAlpha",
  DstColor = "DstColor",
  DstAlpha = "DstAlpha",
  OneMinusSrcColor = "OneMinusSrcColor",
  OneMinusSrcAlpha = "OneMinusSrcAlpha",
  OneMinusDstColor = "OneMinusDstColor",
  OneMinusDstAlpha = "OneMinusDstAlpha"
}

export enum StencilOperation {
  Keep = "Keep",
  Zero = "Zero",
  Replace = "Replace",
  IncrSat = "IncrSat",
  DecrSat = "DecrSat",
  Invert = "Invert",
  IncrWrap = "IncrWrap",
  DecrWrap = "DecrWrap"
}

export class Stencil {
  ref?: number;
  readMask?: number;
  writeMask?: number;
  comp?: CompareMode;
  pass?: StencilOperation;
  fail?: StencilOperation;
  zfail?: StencilOperation;
}

export class State {
  cull?: CullMode;
  zTest?: CompareMode;
  zWrite?: boolean;
  offset?: [number, number];
  blending?: boolean;
  blendSrcFactor?: { [index: number]: BlendFunc };
  blendDestFactor?: { [index: number]: BlendFunc };
  blendSrcAlphaFactor?: { [index: number]: BlendFunc };
  blendDestAlphaFactor?: { [index: number]: BlendFunc };
  blendCommand?: { [index: number]: BlendCommand };
  blendAlphaCommand?: { [index: number]: BlendCommand };
  stencil?: Stencil;
}

export class Pass {
  name?: string;
  tags?: Tags;
  state?: State;
  vertexProgram: string;
  fragmentProgram: string;
}
export class SubShader {
  tags?: Tags;
  state?: State;
  passes: Pass[] | string[] = [];
}

export class Shader {
  name?: string;
  properties?: Property[];
  subShaders: SubShader[];
  fallback?: string | boolean;
}
