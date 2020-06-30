import { Tokenizer, Generator, parseShaderlab } from "./shaderlab";
import SKY_SHADER from "./Skybox-Procedural.shader";
import MESH_SHADER from "./mesh.shader";
import GIZMO_SHADER from "./gizmo.shader";

let d = Date.now();
console.clear();
console.log(parseShaderlab(SKY_SHADER));
console.log(parseShaderlab(MESH_SHADER));
console.log(parseShaderlab(GIZMO_SHADER));
console.log("Compile time:", Date.now() - d);

