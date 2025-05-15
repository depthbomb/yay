{
	"targets": [
		{
			"target_name": "windows-process-tree",
			"sources": ["lib/addon.cc"],
			"include_dirs": [
				"<!@(node -p \"require('node-addon-api').include\")"
			],
			"dependencies": [
				"<!(node -p \"require('node-addon-api').gyp\")"
			],
			"cflags!": ["-fno-exceptions"],
			"cflags_cc!": ["-fno-exceptions"],
			"msvs_settings": {
                "VCCLCompilerTool": {
                    "ExceptionHandling": 1
                }
            },
			"defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"]
		}
	]
}
