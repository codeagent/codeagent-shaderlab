import { Tokenizer, Lexeme } from "./tokenizer";

export enum LexemeType {
  Boolean = "Boolean",
  String = "String",
  Integer = "Integer",
  Float = "Float",
  Identifier = "Identifier",
  Keyword = "Keyword",
  BlockOpen = "BlockOpen",
  BlockClose = "BlockClose",
  Equal = "Equal",
  Comma = "Comma",
  EndExpr = "EndExpr",
  PreprocessorInclude = "PreprocessorInclude",
  PreprocessorPragma = "PreprocessorPragma",
  PreprocessorDefine = "PreprocessorDefine",
  PreprocessorIf = "PreprocessorIf",
  PreprocessorElseIf = "PreprocessorElseIf",
  PreprocessorEndIf = "PreprocessorEndIf",
  Unknown = "Unknown"
}

export enum SemanticNodeType {
  Boolean = "Boolean",
  String = "String",
  Integer = "Integer",
  Float = "Float",
  Identifier = "Identifier",
  Keyword = "Keyword",
  Tuple = "Tuple",
  Equal = "Equal",
  Comma = "Comma"
}

export class SemanticNode {
  type: SemanticNodeType;
  parent: SemanticNode;
  line: number;
  column: number;
  pos: number;
  name?: string;
  data?: any;
  children?: SemanticNode[];
}

const keywords = [
  "Shader",
  "Properties",
  "SubShader",
  "Pass",
  "Tags",
  "Name",
  "UsePass",
  "GrabPass",
  "GLSLPROGRAM",
  "ENDGLSL",
  "Range",
  "Float",
  "Int",
  "Color",
  "Vector",
  "2D",
  "Cube",
  "3D",
  "Filtereing",
  "Address",
  "Mipmaps",
  "Compare",
  "Cull",
  "ZTest",
  "ZWrite",
  "Offset",
  "BlendOp",
  "Blend",
  "AlphaToMask",
  "ColorMask",
  "Stencil",
  "Ref",
  "ReadMask",
  "WriteMask",
  "Comp",
  "Fail",
  "ZFail",
  "Fallback"
];

const SHADERLAB_DEFINITIONS = [
  {
    type: "Keyword",
    pattern: new RegExp(keywords.map(keyword => `^${keyword}\\b`).join("|")),
    formatter: null
  },
  {
    type: "Boolean",
    pattern: /^true|^false/,
    formatter: value => /true/i.test(value[0])
  },
  {
    type: "String",
    pattern: /^(['"])([^'"]*)\1/,
    formatter: value => value[2]
  },
  {
    type: "Float",
    pattern: /^[+-]?\d*\.\d+(e[+=]?\d+)?/,
    formatter: value => parseFloat(value[0])
  },
  {
    type: "Integer",
    pattern: /^[+-]?\d+/,
    formatter: value => parseInt(value[0])
  },
  { type: "Identifier", pattern: /^[a-zA-Z_$]\w*/, formatter: null },
  { type: "BlockOpen", pattern: /^{|^\(/, formatter: null },
  { type: "BlockClose", pattern: /^}|^\)/, formatter: null },
  { type: "Equal", pattern: /^=/, formatter: null },
  { type: "Comma", pattern: /^,/, formatter: null },
  { type: "EndExpr", pattern: /^;/, formatter: null },
  { type: "PreprocessorInclude", pattern: /^#include/, formatter: null },
  { type: "PreprocessorPragma", pattern: /^#pragma/, formatter: null },
  { type: "PreprocessorDefine", pattern: /^#define/, formatter: null },
  { type: "PreprocessorIf", pattern: /^#ifdef|^#if/, formatter: null },
  { type: "PreprocessorElseIf", pattern: /^#elseif|^#elif/, formatter: null },
  { type: "PreprocessorEndIf", pattern: /^#endif/, formatter: null }
];

export class Generator {
  private _tokenizer: Tokenizer;
  private _lexeme: Lexeme;
  private _prevLexeme: Lexeme;
  private _node: SemanticNode;
  private _parent: SemanticNode;

  generateSemanticTree(content: string): SemanticNode {
    this._tokenizer = new Tokenizer(content, SHADERLAB_DEFINITIONS);

    const root = (this._parent = new SemanticNode());
    root.children = [];
    root.column = 0;
    root.line = 0;
    root.pos = 0;
    root.parent = null;
    root.name = "$root";

    while ((this._lexeme = this._tokenizer.next())) {
      if (this._lexeme.value === "GLSLPROGRAM") {
        this._node = this.processGlslProgram(this._tokenizer, content);
        this._node.parent = this._parent;
        this._node.line = this._lexeme.line;
        this._node.pos = this._lexeme.pos;
        this._node.column = this._lexeme.column;
        this._parent.children.push(this._node);
      } else if (this._lexeme.type === LexemeType.BlockOpen) {
        if (this._lexeme.value === "{") {
          this._node.children = [];
          this._parent = this._node;
        } else if (this._lexeme.value === "(") {
          this._node = new SemanticNode();
          this._node.children = [];
          this._node.type = SemanticNodeType.Tuple;
          this._node.parent = this._parent;
          this._parent.children.push(this._node);
          this._parent = this._node;
        }
      } else if (this._lexeme.type === LexemeType.BlockClose) {
        this._node = this._parent;
        this._parent = this._parent.parent;
      } else {
        this._node = new SemanticNode();
        if (
          this._lexeme.type === LexemeType.Float ||
          this._lexeme.type === LexemeType.Integer ||
          this._lexeme.type === LexemeType.Boolean ||
          this._lexeme.type === LexemeType.String
        ) {
          this._node.data = this._lexeme.value as string;
        } else if (this._lexeme.value) {
          this._node.name = this._lexeme.value as string;
        }
        this._node.type =
          SemanticNodeType[this._lexeme.type as keyof typeof SemanticNodeType];
        this._node.parent = this._parent;
        this._node.line = this._lexeme.line;
        this._node.column = this._lexeme.column;
        this._node.pos = this._lexeme.pos;

        if (this._parent) {
          this._parent.children.push(this._node);
        }
      }

      this._prevLexeme = this._lexeme;
    }

    return root;
  }

  private processGlslProgram(tokenizer: Tokenizer, content: string) {
    const parent = new SemanticNode();
    parent.type = SemanticNodeType.Keyword;
    parent.name = "GLSLPROGRAM";

    parent.children = [];

    let counter = 0;
    let shaderBegin = -1;
    let shaderEnd = -1;

    let shaderType: string;

    while (
      (this._lexeme = tokenizer.next()) &&
      this._lexeme.value !== "ENDGLSL"
    ) {
      if (
        this._prevLexeme &&
        this._prevLexeme.type === LexemeType.PreprocessorIf
      ) {
        if (
          this._lexeme.value === "VERTEX" ||
          this._lexeme.value === "FRAGMENT"
        ) {
          shaderType = this._lexeme.value as string;
          shaderBegin = this._lexeme.pos + shaderType.length;
        }

        if (shaderBegin !== -1) {
          counter++;
        }
      }

      if (this._lexeme.type === LexemeType.PreprocessorEndIf) {
        if (shaderBegin !== -1) {
          counter--;
        }
      }

      if (counter === 0 && shaderBegin !== -1) {
        shaderEnd = this._lexeme.pos;
        const node = new SemanticNode();
        node.type = SemanticNodeType.String;
        node.name = shaderType;
        node.data = content.substring(shaderBegin, shaderEnd);
        node.parent = parent;
        parent.children.push(node);

        shaderBegin = -1;
        shaderEnd = -1;
      }

      this._prevLexeme = this._lexeme;
    }

    return parent;
  }
}
