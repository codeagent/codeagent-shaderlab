import { Tokenizer } from "../shaderlab"; // we will borrow tokenizer from shaderLab package

// @Service
export class Preprocessor {
  private static _instance: Preprocessor;

  static get instance() {
    if (!Preprocessor._instance) {
      Preprocessor._instance = new Preprocessor();
    }
    return Preprocessor._instance;
  }
  // #include "token" => content
  private _cache = new Map<string, string>();
  private _defines = new Set<string>();

  clearDefines() {
    this._defines.clear();
  }
  addDefine(name) {
    this._defines.add(name);
  }
  async assembly(content: string): Promise<string> {
    Tokenizer;
    return "";
  }
}
