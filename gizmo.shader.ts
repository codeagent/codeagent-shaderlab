export default `

Shader "$gizmo" {
Properties {
  tint ("Gizmo color", Color) = (1.0, 1.0, 1.0)
}

SubShader {
	Pass {
    Name "wired"
    ZTest Never
    ZWrite Off
		
		CGPROGRAM

    #ifdef VERTEX
    
    layout(location = 0) in vec3 position;
    layout(location = 1) in vec3 color;

    uniform mat4 viewProjMat;
    uniform mat4 worldMat;
    uniform vec3 tint;

    out vec3 _position;
    out vec3 _color;

    void main()
    {
      _color = color * tint;
      _position = vec3(worldMat * vec4(position, 1.0f));
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

    in vec3 _color;
    in vec3 _position;

    void main()
    {
      setMatID(3.0f);
      setPos(_position);
      setAlbedo(_color);
      setNormal(vec3(0.0f));
      setMetallic(0.0f);
      setRoughness(0.0f);
      setEmission(_color);
    }

    #endif
	
		ENDCG
	}

  Pass {
    Name "flat"
    ZTest LEqual
    ZWrite Off
		
		CGPROGRAM

    #ifdef VERTEX
    
    layout(location = 0) in vec3 position;
    layout(location = 1) in vec3 color;

    uniform mat4 viewProjMat;
    uniform mat4 worldMat;
    uniform vec3 tint;

    out vec3 _position;
    out vec3 _color;

    void main()
    {
      _color = color * tint;
      _position = vec3(worldMat * vec4(position, 1.0f));
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

    in vec3 _color;
    in vec3 _position;

    void main()
    {
      setMatID(3.0f);
      setPos(_position);
      setAlbedo(_color);
      setNormal(vec3(0.0f));
      setMetallic(0.0f);
      setRoughness(0.0f);
      setEmission(_color);
    }

    #endif
	
		ENDCG
	}
} 	
}`;