export default `

Shader "$mesh" {
Properties {
	matAlbedo ("Albedo color", Color) = (1, 1, 1)
	matMetallicRoughness ("Metallic and roughness", Vector) = (0.2, 0.2)
	matEmission ("Emission tint", Color) = (0.0, 0.0, 0.0)
  albedoMap ("Albedo map", 2D) = "$white" {
    Filtereing Linear
    Address Repeat
    Mipmaps On
  } 
  aoMap ("Ambient occlusion map", 2D) = "$white" { 
    Filtereing Linear
    Address Repeat
    Mipmaps On
  }
  metallicMap ("Metalic map", 2D) = "$gray-20" { 
    Filtereing Linear
    Address Repeat
    Mipmaps On
  }
  normalMap ("Normal map", 2D) = "$flat" { 
    Filtereing Linear
    Address Repeat
    Mipmaps On
  }
  roughnessMap ("Rougness map", 2D) = "$gray-20" { 
    Filtereing Linear
    Address Repeat
    Mipmaps On
  }
  emissionMap ("Rougness map", 2D) = "$black" { 
    Filtereing Linear
    Address Repeat
    Mipmaps On
  }
}

SubShader {
	Pass {
    Name "gpass"
		
    Cull Off
    
		CGPROGRAM

    #ifdef VERTEX
    
    layout(location = 0) in vec3 position;
    layout(location = 1) in vec3 normal;
    layout(location = 2) in vec2 uv;
    layout(location = 3) in vec3 tangent;
    layout(location = 4) in float handedness;

    uniform mat4 viewMat;
    uniform mat4 projMat;
    uniform mat4 viewProjMat;
    uniform mat4 worldMat;

    out vec3 _normal;
    out vec3 _position;
    out vec2 _texcoords;
    out vec3 _tangent;
    out vec3 _bitangent;

    void main()
    {
      #ifdef FLIP_UVS
        _texcoords = vec2(uv.x, 1.0f - uv.y);
      #else 
        _texcoords = vec2(uv.x, uv.y);
      #endif

      _position = vec3(worldMat * vec4(position, 1.0f));
      _normal = mat3(worldMat) * normal;
      _tangent = mat3(worldMat) * tangent;
      _bitangent = mat3(worldMat) * cross(normal, tangent) * handedness;
      gl_Position = viewProjMat * vec4(_position, 1.0f);
    }

    #endif

    #ifdef FRAGMENT 

    layout( location = 0 ) out vec4 gbuff0;	// vec4(position.xyz, matID)
    layout( location = 1 ) out vec4 gbuff1;	// vec4(normal.xyz, metallic)
    layout( location = 2 ) out vec4 gbuff2;	// vec4(albedo.rgb, rougness)
    layout( location = 3 ) out vec4 gbuff3; // vec4(emission.rgb, 0.0)

    void setMatID( const float id ) { gbuff0.a = id; }
    void setPos( const vec3 pos ) { gbuff0.rgb = pos; }
    void setNormal( const vec3 normal ) { gbuff1.rgb = normal; }
    void setMetallic(const float metallic) { gbuff1.a = metallic; }
    void setAlbedo( const vec3 albedo ) { gbuff2.rgb = albedo; }
    void setRoughness(const float roughness) { gbuff2.a = roughness; }
    void setEmission( const vec3 emission ) { gbuff3.rgb = emission; }

    uniform vec3 matAlbedo;
    uniform vec2 matMetallicRoughness;
    uniform vec3 matEmission;

    uniform sampler2D albedoMap;
    uniform sampler2D aoMap;
    uniform sampler2D metallicMap;
    uniform sampler2D normalMap;
    uniform sampler2D roughnessMap;
    uniform sampler2D emissionMap;

    uniform vec3 camPos;

    in vec3 _normal;
    in vec3 _position;
    in vec2 _texcoords;
    in vec3 _tangent;
    in vec3 _bitangent;

    void main()
    {
      vec3 albedo = texture(albedoMap, _texcoords).rgb * matAlbedo;
      float ao = texture(aoMap, _texcoords).r;
      float metallic = texture(metallicMap, _texcoords).r * matMetallicRoughness.r;
      float roughness = texture(roughnessMap, _texcoords).g * matMetallicRoughness.g;
      vec3 emission = texture(emissionMap, _texcoords).rgb * matEmission.rgb;
      vec3 normal = texture(normalMap, _texcoords).rgb * 2.0f - 1.0f;

      mat3 tbn = mat3(normalize(_tangent), normalize(_bitangent), normalize(_normal));

      setMatID(1.0f);
      setPos(_position);
      setNormal(tbn * normal);
      setMetallic(metallic);
      setAlbedo(albedo * ao);
      setRoughness(roughness);
      setEmission(emission);
    }
    #endif
	
		ENDCG
	}
} 	

}
`;