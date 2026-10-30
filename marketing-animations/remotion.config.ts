import { Config } from "@remotion/cli/config";

// PNG frames keep the flat brand colours exact (no JPEG fringing on text).
Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);
Config.setEntryPoint("src/index.ts");
