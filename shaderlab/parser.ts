import {
  Shader,
  Property,
  SubShader,
  PropertyType,
  Tags,
  Pass,
  State,
  Stencil,
  CullMode,
  BlendFunc,
  BlendCommand,
  CompareMode,
  StencilOperation,
  Sampler,
  FilterMode,
  AddressMode
} from "./shaderlab";

import { Generator, SemanticNode, SemanticNodeType } from "./generator";

export const parseShaderlab = (content: string) => new Parser().parse(content);

export class Parser {
  private _generator: Generator;
  constructor() {
    this._generator = new Generator();
  }

  parse(content: string): Shader {
    let root = this._generator.generateSemanticTree(content);
    if (root.children[0].name !== "Shader") {
      throw new Error(
        `Unexpected keyword "${root.name}". Root 'Shader' keyword required`
      );
    }

    if (root.children[1].type !== SemanticNodeType.String) {
      throw new Error(`Root Shader name required`);
    }

    root = root.children[1];

    const shader: Shader = new Shader();
    shader.name = root.data;
    shader.subShaders = [];

    let fallback = null;
    let i = 0;
    while (i < root.children.length) {
      const node = root.children[i];
      if (node.name === "Properties") {
        shader.properties = this.parseShaderProperties(node);
      } else if (node.name === "SubShader") {
        shader.subShaders.push(this.parseSubShader(node));
      } else if (node.name === "Fallback") {
        const value = root.children[++i];
        shader.fallback =
          value.type === SemanticNodeType.String
            ? (value.data as string)
            : (/^On$/i.test(value.data) as boolean);
      }
      i++;
    }

    return shader;
  }

  private parseShaderProperties(node: SemanticNode): Property[] {
    let properties = [];
    let i = 0;
    let property: Property = null;
    while (i < node.children.length) {
      if (node.children[i].type !== SemanticNodeType.Identifier) {
        throwUnexpected(node.children[i]);
      }
      property = new Property();
      property.name = node.children[i].name;

      i++;

      if (node.children[i].type !== SemanticNodeType.Tuple) {
        throwUnexpected(node.children[i]);
      }
      let meta = this.parseTuple(node.children[i]);
      if (meta.length < 2) {
        throw new Error(`Property must consist of display name and type`);
      }

      property.displayName = meta[0];
      property.type = enumValue(meta[1], PropertyType);

      if (property.type === PropertyType.Range) {
        property.rangeMin = meta[2][0];
        property.rangeMax = meta[2][1];
      }

      i++;

      if (node.children[i].type !== SemanticNodeType.Equal) {
        throwUnexpected(node.children[i]);
      }

      i++;

      let value;
      if (node.children[i].type === SemanticNodeType.Tuple) {
        property.value = this.parseTuple(node.children[i]);
      } else {
        property.value = node.children[i].data;
        if (node.children[i].type === SemanticNodeType.String) {
          property.sampler = this.parseSampler(node.children[i]);
        }
      }

      properties.push(property);

      i++;
    }
    return properties;
  }

  private parseSampler(node: SemanticNode): Sampler {
    const sampler = new Sampler();
    let i = 0;
    while (i < node.children.length) {
      if (/^Filtereing$/i.test(node.children[i].name)) {
        i++;
        let mode = enumValue(node.children[i].name, FilterMode);
        if (!mode) {
          throwUnexpected(node.children[i]);
        }
        sampler.filtering = mode;
      } else if (/^Address$/.test(node.children[i].name)) {
        i++;
        let mode = enumValue(node.children[i].name, AddressMode);
        if (!mode) {
          throwUnexpected(node.children[i]);
        }
        sampler.address = mode;
      } else if (/^Mipmaps$/.test(node.children[i].name)) {
        i++;
        sampler.mipmaps = /On/i.test(node.children[i].name);
      } else if (/^Compare$/.test(node.children[i].name)) {
        i++;
        let mode = enumValue(node.children[i].name, CompareMode);
        if (!mode) {
          throwUnexpected(node.children[i]);
        }
        sampler.compare = mode;
      }
      i++;
    }
    return sampler;
  }

  private parseSubShader(node: SemanticNode): SubShader {
    const subshader = new SubShader();
    let i = 0;
    while (i < node.children.length) {
      if (/^Tags$/i.test(node.children[i].name)) {
        subshader.tags = this.parseTags(node.children[i]);
      } else if (/^Pass$/i.test(node.children[i].name)) {
        subshader.passes.push(this.parsePass(node.children[i]) as any);
      } else if (/^UsePass$/i.test(node.children[i].name)) {
        i++;
        if (node.children[i].type !== SemanticNodeType.String) {
          throwUnexpected(node.children[i]);
        }
        subshader.passes.push(node.children[i].data as any);
      }
      i++;
    }

    subshader.state = this.parseState(node);

    return subshader;
  }

  private parsePass(node: SemanticNode): Pass {
    const pass = new Pass();
    let i = 0;
    while (i < node.children.length) {
      if (/^Name$/i.test(node.children[i].name)) {
        i++;
        if (node.children[i].type !== SemanticNodeType.String) {
          throwUnexpected(node.children[i]);
        }
        pass.name = node.children[i].data;
      } else if (/^Tags$/i.test(node.children[i].name)) {
        pass.tags = this.parseTags(node.children[i]);
      } else if (/^GLSLPROGRAM$/.test(node.children[i].name)) {
        let [vertexProgram, fragmentProgram] = this.parseGlslProgram(
          node.children[i]
        );
        pass.vertexProgram = vertexProgram;
        pass.fragmentProgram = fragmentProgram;
      }
      i++;
    }

    pass.state = this.parseState(node);

    return pass;
  }

  private parseTuple(node: SemanticNode): any[] {
    let tuple = [];
    let i = 0;
    let j = 0;
    //@todo: comma errors
    while (i < node.children.length) {
      if (node.children[i].type === SemanticNodeType.Tuple) {
        j++;
      }

      if (node.children[i].type !== SemanticNodeType.Comma) {
        if (j % 2 !== 0) {
          throwUnexpected(node.children[i]);
        }
        if (node.children[i].type === SemanticNodeType.Tuple) {
          tuple.push(this.parseTuple(node.children[i]));
        } else {
          tuple.push(node.children[i].name || node.children[i].data);
        }
      } else {
        if (j % 2 === 0) {
          throwUnexpected(node.children[i]);
        }
      }

      i++;
      j++;
    }
    return tuple;
  }

  private parseTags(node: SemanticNode): Tags {
    const tags: Tags = {};
    let i = 0;
    while (i < node.children.length) {
      if (node.children[i].type !== SemanticNodeType.String) {
        throwUnexpected(node.children[i]);
      }
      let name = node.children[i].data;
      i++;
      if (node.children[i].type !== SemanticNodeType.Equal) {
        throwUnexpected(node.children[i]);
      }
      i++;
      if (node.children[i].type !== SemanticNodeType.String) {
        throwUnexpected(node.children[i]);
      }
      tags[name] = node.children[i].data;

      i++;
    }
    return tags;
  }

  private parseGlslProgram(node: SemanticNode): [string, string] {
    if (node.children.length !== 2) {
      throw new Error(
        `Vertex & fragment shaders program must present in the same pass (line ${
          node.line
        } column: ${node.column})`
      );
    }

    let vertex =
      node.children[0].name === "VERTEX"
        ? node.children[0].data
        : node.children[1].data;

    let fragment =
      node.children[1].name === "FRAGMENT"
        ? node.children[1].data
        : node.children[0].data;

    return [vertex, fragment];
  }

  private parseState(node: SemanticNode): State {
    const state = new State();
    let i = 0;
    let blendSlot = 0;
    while (i < node.children.length) {
      if (/^Cull$/i.test(node.children[i].name)) {
        i++;
        let mode = enumValue(node.children[i].name, CullMode);
        if (mode) {
          state.cull = mode;
        } else {
          throwUnexpected(node.children[i]);
        }
      } else if (/^ZWrite$/i.test(node.children[i].name)) {
        i++;
        if (/^Off$/i.test(node.children[i].name)) {
          state.zWrite = false;
        } else if (/^On$/i.test(node.children[i].name)) {
          state.zWrite = true;
        } else {
          throwUnexpected(node.children[i]);
        }
      } else if (/^ZTest$/i.test(node.children[i].name)) {
        i++;
        let mode = enumValue(node.children[i].name, CompareMode);
        if (mode) {
          state.zTest = mode;
        } else {
          throwUnexpected(node.children[i]);
        }
      } else if (/^Offset$/i.test(node.children[i].name)) {
        i++;
        if (!isNumber(node.children[i])) {
          throwUnexpected(node.children[i]);
        }
        let factor = node.children[i].data;
        i++;
        if (node.children[i].type !== SemanticNodeType.Comma) {
          throwUnexpected(node.children[i]);
        }
        i++;
        if (!isNumber(node.children[i])) {
          throwUnexpected(node.children[i]);
        }
        state.offset = [factor, node.children[i].data];
      } else if (/^Blend$/i.test(node.children[i].name)) {
        i++;
        if (state.blending !== false) {
          state.blending = true;
        }
        if (/^Off$/i.test(node.children[i].name)) {
          state.blending = false;
        } else {
          if (isNumber(node.children[i])) {
            blendSlot = node.children[i].data;
            i++;
          } else {
            blendSlot = 0;
          }
          let srcFactor = enumValue(node.children[i].name, BlendFunc);
          if (!srcFactor) {
            throwUnexpected(node.children[i]);
          }

          i++;
          let dstFactor = enumValue(node.children[i].name, BlendFunc);
          if (!dstFactor) {
            throwUnexpected(node.children[i]);
          }

          state.blendSrcFactor =
            state.blendSrcFactor || ({} as { [index: number]: BlendFunc });

          state.blendDestFactor =
            state.blendDestFactor || ({} as { [index: number]: BlendFunc });

          state.blendSrcFactor[blendSlot] = srcFactor;
          state.blendDestFactor[blendSlot] = dstFactor;

          if (node.children[i + 1].type === SemanticNodeType.Comma) {
            i += 2;

            let srcAlphaFactor = enumValue(node.children[i].name, BlendFunc);
            if (!srcAlphaFactor) {
              throwUnexpected(node.children[i]);
            }

            i++;
            let dstAlphaFactor = enumValue(node.children[i].name, BlendFunc);
            if (!dstAlphaFactor) {
              throwUnexpected(node.children[i]);
            }

            state.blendSrcAlphaFactor =
              state.blendSrcAlphaFactor ||
              ({} as { [index: number]: BlendFunc });

            state.blendDestAlphaFactor =
              state.blendDestAlphaFactor ||
              ({} as { [index: number]: BlendFunc });

            state.blendSrcAlphaFactor[blendSlot] = srcAlphaFactor;
            state.blendDestAlphaFactor[blendSlot] = dstAlphaFactor;
          }
        }
      } else if (/^BlendOp$/i.test(node.children[i].name)) {
        i++;
        if (state.blending !== false) {
          state.blending = true;
        }

        if (isNumber(node.children[i])) {
          blendSlot = node.children[i].data;
          i++;
        } else {
          blendSlot = 0;
        }
        let command = enumValue(node.children[i].name, BlendCommand);
        if (!command) {
          throwUnexpected(node.children[i]);
        }

        state.blendCommand =
          state.blendCommand || ({} as { [index: number]: BlendCommand });

        state.blendCommand[blendSlot] = command;

        if (node.children[i + 1].type === SemanticNodeType.Comma) {
          i += 2;

          let alphaCommand = enumValue(node.children[i].name, BlendCommand);
          if (!alphaCommand) {
            throwUnexpected(node.children[i]);
          }
          state.blendAlphaCommand =
            state.blendAlphaCommand ||
            ({} as { [index: number]: BlendCommand });

          state.blendAlphaCommand[blendSlot] = alphaCommand;
        }
      } else if (/^Stencil$/i.test(node.children[i].name)) {
        state.stencil = this.parseStencil(node.children[i]);
      }
      i++;
    }
    return state;
  }

  private parseStencil(node: SemanticNode): Stencil {
    const stencil = new Stencil();
    let i = 0;
    let blendSlot = 0;
    while (i < node.children.length) {
      if (/^Ref$/i.test(node.children[i].name)) {
        i++;
        if (!isNumber(node.children[i])) {
          throwUnexpected(node.children[i]);
        }
        stencil.ref = node.children[i].data;
      } else if (/^ReadMask$/i.test(node.children[i].name)) {
        i++;
        if (!isNumber(node.children[i])) {
          throwUnexpected(node.children[i]);
        }
        stencil.readMask = node.children[i].data;
      } else if (/^WriteMask$/i.test(node.children[i].name)) {
        i++;
        if (!isNumber(node.children[i])) {
          throwUnexpected(node.children[i]);
        }
        stencil.writeMask = node.children[i].data;
      } else if (/^Comp$/i.test(node.children[i].name)) {
        i++;
        let mode = enumValue(node.children[i].name, CompareMode);
        if (!mode) {
          throwUnexpected(node.children[i]);
        }
        stencil.comp = mode;
      } else if (
        /^Pass$/i.test(node.children[i].name) ||
        /^Fail$/i.test(node.children[i].name) ||
        /^ZFail$/i.test(node.children[i].name)
      ) {
        let name = node.children[i].name;
        i++;
        let operation = enumValue(node.children[i].name, StencilOperation);
        if (!operation) {
          throwUnexpected(node.children[i]);
        }
        stencil[name.toLowerCase()] = operation;
      }
      i++;
    }
    return stencil;
  }
}

const throwUnexpected = (node: SemanticNode) => {
  throw new Error(
    `Unexpected token at line ${node.line + 1} column ${node.column + 1}`
  );
};

const isNumber = (node: SemanticNode) =>
  node.type === SemanticNodeType.Float ||
  node.type === SemanticNodeType.Integer;

const enumValue = (str: string, e: any) => {
  let entry = Object.entries(e).find(
    ([key, value]) => value.toLowerCase() === str.toLowerCase()
  );
  if (entry) {
    return entry[1];
  }
  return null;
};
