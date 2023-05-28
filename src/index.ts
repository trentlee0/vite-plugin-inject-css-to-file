import { PluginOption } from 'vite'

interface InjectCssToFileOptions {
  // default: 'index.js'
  fileNames?: string | string[]
  // default: '/* inject css replacing */'
  replacing?: string
  injector?: (
    target: { fileName: string; code: string },
    cssCode: string
  ) => string
}

export default function injectCssToFile(
  options: InjectCssToFileOptions
): PluginOption {
  let fileNames = options.fileNames ?? 'index.js'
  if (!Array.isArray(fileNames)) {
    fileNames = [fileNames]
  }

  const replacing = options.replacing || '/* inject css replacing */'
  const encode = (keyword: string) => {
    const reg = /[\[\(\$\^\.\]\*\\\?\+\{\}\\|\)]/gi
    return keyword.replace(reg, (key) => `\\${key}`)
  }
  const injector =
    options.injector ??
    ((target, cssCode) =>
      target.code.replace(
        new RegExp(`['"]?${encode(replacing)}['"]?`),
        JSON.stringify(cssCode)
      ))

  return {
    name: 'inject-css-to-file',
    enforce: 'post',
    apply: (config, { command }) => {
      return command === 'build'
    },
    generateBundle: (options, bundle) => {
      let cssCode = ''
      for (const key in bundle) {
        const out = bundle[key]
        if (out.type === 'asset' && out.fileName.endsWith('.css')) {
          cssCode += out.source
          Reflect.deleteProperty(bundle, key)
        }
      }

      for (const fileName of fileNames) {
        for (const key in bundle) {
          const out = bundle[key]
          if (out.type === 'chunk' && out.fileName === fileName) {
            out.code = injector({ fileName, code: out.code }, cssCode)
            break
          }
        }
      }
    }
  }
}
