#!/bin/sh

# Install dependencies
npm install

# Create a backup of the original config
cp /app/studio/vite.config.ts /app/studio/vite.config.ts.backup

# Create a modified config without HTTPS
cat > /app/studio/vite.config.ts << 'EOF'
import {defineConfig, UserConfig} from "vite"
import {resolve} from "path"
import * as path from "node:path"
import {readFileSync, writeFileSync} from "fs"
import {randomUUID} from "crypto"
import {BuildInfo} from "./src/BuildInfo"
import viteCompression from "vite-plugin-compression"
import crossOriginIsolation from "vite-plugin-cross-origin-isolation"

export default defineConfig(({mode, command}) => {
    const uuid = randomUUID()
    const env = process.env.NODE_ENV as BuildInfo["env"]
    const date = Date.now()
    const config: UserConfig = {
        base: "/",
        mode,
        plugins: [
            crossOriginIsolation(),
            {
                name: "generate-date-json",
                buildStart() {
                    const outputPath = resolve(__dirname, "public", "build-info.json")
                    writeFileSync(outputPath, JSON.stringify({date, uuid, env} satisfies BuildInfo, null, 2))
                    console.debug(`Build info written to: ${outputPath}`)
                }
            },
            {
                name: "spa",
                configureServer(server) {
                    server.middlewares.use((req, res, next) => {
                        const url: string | undefined = req.url
                        if (url !== undefined && url.indexOf(".") === -1 && !url.startsWith("/@vite/")) {
                            const indexPath = path.resolve(__dirname, "index.html")
                            res.end(readFileSync(indexPath))
                        } else {
                            next()
                        }
                    })
                }
            },
            viteCompression({
                algorithm: "brotliCompress"
            })
        ],
        resolve: {
            alias: {"@": resolve(__dirname, "./src")}
        },
        build: {
            target: "esnext",
            minify: true,
            sourcemap: true,
            rollupOptions: {
                output: {
                    format: "es",
                    entryFileNames: `[name].${uuid}.js`,
                    chunkFileNames: `[name].${uuid}.js`,
                    assetFileNames: `[name].${uuid}.[ext]`
                }
            }
        },
        esbuild: {
            target: "esnext"
        },
        clearScreen: false
    }
    if (command === "serve") {
        config.server = {
            port: 8080,
            strictPort: true,
            // HTTPS disabled for development
            watch: {
                ignored: ["**/src-tauri/**"]
            }
        }
    }
    return config
})
EOF

# Start the development server
npm run dev -- --host 0.0.0.0 --port 8080 