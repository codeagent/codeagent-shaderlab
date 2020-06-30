import { first, isString } from "lodash";

import { Shader as Shaderlab, parseShaderlab } from "../shaderlab";
import * as shaderLab from "../shaderlab";
import { Preprocessor } from "./preprocessor";

export type ShaderProgram = WebGLProgram;
export type UniformLocation = WebGLUniformLocation;
export type Texture2D = WebGLTexture;
export type Texture3D = WebGLTexture;
export type TextureCube = WebGLTexture;
export type Sampler = WebGLSampler;

export enum TextureFiltering {
  Nearest,
  Linear
}

export enum TextureAddressMode {
  Repeat = WebGL2RenderingContext.REPEAT,
  Mirror = WebGL2RenderingContext.MIRRORED_REPEAT,
  Edge = WebGL2RenderingContext.CLAMP_TO_EDGE
}

export enum CompareMode {
  None = WebGL2RenderingContext.NONE,
  Lequal = WebGL2RenderingContext.LEQUAL,
  Gequal = WebGL2RenderingContext.GEQUAL,
  Less = WebGL2RenderingContext.LESS,
  Greater = WebGL2RenderingContext.GREATER,
  Equal = WebGL2RenderingContext.EQUAL,
  NotEqual = WebGL2RenderingContext.NOTEQUAL,
  Always = WebGL2RenderingContext.ALWAYS
}

export enum CullMode {
  Front = WebGL2RenderingContext.FRONT,
  Back = WebGL2RenderingContext.BACK,
  None = WebGL2RenderingContext.NONE
}

export enum BlendFunc {
  Zero = WebGL2RenderingContext.ZERO,
  SrcAlpha = WebGL2RenderingContext.SRC_ALPHA,
  SrcColor = WebGL2RenderingContext.SRC_COLOR,
  OneMinusSrcAlpha = WebGL2RenderingContext.ONE_MINUS_SRC_ALPHA,
  DstAlpha = WebGL2RenderingContext.DST_ALPHA,
  DstColor = WebGL2RenderingContext.DST_COLOR,
  OneMinusDstAlpha = WebGL2RenderingContext.ONE_MINUS_DST_ALPHA,
  One = WebGL2RenderingContext.ONE
}

export enum BlendCommand {
  Add = WebGL2RenderingContext.FUNC_ADD,
  Sub = WebGL2RenderingContext.FUNC_SUBTRACT,
  RevSub = WebGL2RenderingContext.FUNC_REVERSE_SUBTRACT,
  Min = WebGL2RenderingContext.MIN,
  Max = WebGL2RenderingContext.MAX
}

export enum StencilOperation {
  Keep = WebGL2RenderingContext.KEEP,
  Zero = WebGL2RenderingContext.ZERO,
  Replace = WebGL2RenderingContext.REPLACE,
  IncrSat = WebGL2RenderingContext.INCR,
  DecrSat = WebGL2RenderingContext.DECR,
  Invert = WebGL2RenderingContext.INVERT,
  IncrWrap = WebGL2RenderingContext.INCR_WRAP,
  DecrWrap = WebGL2RenderingContext.DECR_WRAP
}

export enum ShaderUniformType {
  Mat4,
  Mat3,
  Mat2,
  Vec4,
  Vec3,
  Vec2,
  Ivec4,
  Ivec3,
  Ivec2,
  Uvec4,
  Uvec3,
  Uvec2,
  Float,
  Int,
  Uint,
  Sampler2d,
  SamplerCube
}

// ===================================================================

export interface SamplerParams {
  filtering: TextureFiltering;
  addressMode: TextureAddressMode;
  mipmaps: boolean;
  default: Texture2D | Texture3D | TextureCube;
  compareMode: CompareMode;
  type: string;
}

export interface Stencil {
  ref: number;
  readMask: number;
  writeMask: number;
  comp: CompareMode;
  pass: StencilOperation;
  fail: StencilOperation;
  zfail: StencilOperation;
}

export class RenderState {
  cull: CullMode;
  zTest: CompareMode;
  zWrite: boolean;
  offset: [number, number];
  blending: boolean;
  blendSrcFactor: { [index: number]: BlendFunc };
  blendDestFactor: { [index: number]: BlendFunc };
  blendSrcAlphaFactor: { [index: number]: BlendFunc };
  blendDestAlphaFactor: { [index: number]: BlendFunc };
  blendCommand: { [index: number]: BlendCommand };
  blendAlphaCommand: { [index: number]: BlendCommand };
  stencil: Stencil;
}

export class ShaderProperty {
  name: string;
  type: string;
  value: any;
  samplerParams?: SamplerParams; //?
  sampler?: Sampler;
}

export class Shader {
  readonly name: string;
  readonly properties = new Map<string, ShaderProperty>();
  readonly tags = new Map<string, string>();

  constructor(public shaderlab: Shaderlab) {
    this.name = shaderlab.name;
    this.parseProperties();
    this.parseTags();
  }

  variant() {
    return new ShaderVariantBuilder(this);
  }

  private parseProperties() {
    this.shaderlab.properties.forEach(property => {
      const name = property.name;
      const type = property.type;
      let value: any = property.value;
      let samplerParams = null;
      let sampler = null;
      if (property.type === shaderLab.PropertyType.Texture2D) {
        value = AssetsCache.textures2d.get(value) as Texture2D;
        samplerParams = this.parseSamplerParams(property);
        sampler = this.createSampler(samplerParams);
      } else if (property.type === shaderLab.PropertyType.Texture3D) {
        value = AssetsCache.textures3d.get(value) as Texture3D;
        samplerParams = this.parseSamplerParams(property);
        sampler = this.createSampler(samplerParams);
      } else if (property.type === shaderLab.PropertyType.TextureCube) {
        value = AssetsCache.cubamaps.get(value) as TextureCube;
        samplerParams = this.parseSamplerParams(property);
        sampler = this.createSampler(samplerParams);
      }

      this.properties.set(name, {
        name,
        type,
        value,
        samplerParams,
        sampler
      });
    });
  }

  private parseSamplerParams(property: shaderLab.Property): SamplerParams {
    const filtering = enumValue(property.sampler.filtering, TextureFiltering);
    const addressMode = enumValue(property.sampler.address, TextureAddressMode);
    const mipmaps = property.sampler.mipmaps;
    let def;
    if (property.type === shaderLab.PropertyType.Texture2D) {
      def = AssetsCache.textures2d.get(property.value as string) as Texture2D;
    } else if (property.type === shaderLab.PropertyType.Texture3D) {
      def = AssetsCache.textures3d.get(property.value as string) as Texture3D;
    } else if (property.type === shaderLab.PropertyType.TextureCube) {
      def = AssetsCache.cubamaps.get(property.value as string) as TextureCube;
    }
    let type = property.type;
    const compareMode = enumValue(property.sampler.compare, CompareMode);

    return {
      filtering,
      addressMode,
      mipmaps,
      default: def,
      type,
      compareMode
    } as SamplerParams;
  }

  private createSampler(samplerParams: SamplerParams) {
    return null;
  }

  private parseTags() {
    const subShader: shaderLab.SubShader = first(this.shaderlab.subShaders);
    Object.keys(subShader.tags).forEach(key =>
      this.tags.set(key, subShader.tags[key])
    );
  }
}

export interface UniformInfo {
  name: string;
  location: UniformLocation;
  type: ShaderUniformType;
}

export class ShaderPass {
  features = new Set<string>();
  tags = new Map<string, string>();
  renderState = new RenderState();
  uniforms: { [name: string]: UniformInfo } = {};
  program: ShaderProgram;
}

export class ShaderVariant {
  shader: Shader;
  passes = new Map<string, ShaderPass>();
}

export class ShaderVariantBuilder {
  private static _cache = new Map<string, ShaderVariant>(); // mask -> variant
  private _features = new Set<string>();
  private _preprocessor = Preprocessor.instance;

  get shader() {
    return this._shader;
  }

  constructor(private _shader: Shader) {}

  addFeature(name: string) {
    this._features.add(name);
    return this;
  }

  async compile(): Promise<ShaderVariant> {
    const key = Array.from(this._features.values())
      .sort()
      .join("|");

    if (!ShaderVariantBuilder._cache.has(key)) {
      this._preprocessor.clearDefines();
      this._features.forEach(feature => this._preprocessor.addDefine(feature));

      const shaderVariant = new ShaderVariant();
      for (const pass of this._shader.shaderlab.subShaders[0].passes) {
        let shaderPass: ShaderPass;
        if (!isString(pass)) {
          const tags = this.getTags(pass as shaderLab.Pass);
          const renderState = this.getRenderState(pass as shaderLab.Pass);
          const program = await this.assemblyAndCompileProgram(
            pass as shaderLab.Pass
          );
          const uniforms = this.getUniforms(pass as shaderLab.Pass, program);
          const features = this._features;

          shaderPass = new ShaderPass();
          shaderPass.features = features;
          shaderPass.tags = tags;
          shaderPass.renderState = renderState;
          shaderPass.uniforms = uniforms;
          shaderPass.program = program;

          shaderVariant.passes.set((pass as shaderLab.Pass).name, shaderPass);
        } else {
          //@todo:
        }
      }
      ShaderVariantBuilder._cache.set(key, shaderVariant);
    }
    return ShaderVariantBuilder._cache.get(key);
  }

  private getTags(pass: shaderLab.Pass): Map<string, string> {
    const tags = new Map<string, string>();
    Object.keys(pass.tags).forEach(key => tags.set(key, pass.tags[key]));
    return tags;
  }

  // @todo:
  private getRenderState(pass: shaderLab.Pass): RenderState {
    return new RenderState();
  }

  // @todo:
  private getUniforms(
    pass: shaderLab.Pass,
    program: ShaderProgram
  ): { [name: string]: UniformInfo } {
    return {};
  }

  //@todo:
  private async assemblyAndCompileProgram(
    pass: shaderLab.Pass
  ): Promise<ShaderProgram> {
    const vs = await this._preprocessor.assembly(pass.vertexProgram);
    const fs = await this._preprocessor.assembly(pass.vertexProgram);
    

    return null;
  }
}

////------------------------

export class AssetsCache {
  static readonly textures2d = new Map<string, Texture2D>();
  static readonly textures3d = new Map<string, Texture3D>();
  static readonly cubamaps = new Map<string, TextureCube>();
}

export class AssetsManager {
  async resolveShader(path: string) {
    const response = await fetch(path);
    const content = await response.text();
    const shaderlab = parseShaderlab(content);

    // put textures in cache
    shaderlab.properties.forEach(async property => {
      if (property.type === shaderLab.PropertyType.Texture2D) {
        AssetsCache.textures2d.set(
          path,
          await this.resolveTexture(property.value as string)
        );
      } else if (property.type === shaderLab.PropertyType.Texture3D) {
        AssetsCache.textures3d.set(
          path,
          await this.resolveTexture(property.value as string)
        );
      } else if (property.type === shaderLab.PropertyType.TextureCube) {
        AssetsCache.cubamaps.set(
          path,
          await this.resolveTexture(property.value as string)
        );
      }
    });

    return new Shader(shaderlab);
  }

  // @dummy
  async resolveTexture(path: string) {
    return 1;
  }
}

const enumValue = (str: string, e: any) => {
  let entry = Object.entries(e).find(
    ([key, value]) => value.toLowerCase() === str.toLowerCase()
  );
  if (entry) {
    return entry[1];
  }
  return null;
};
