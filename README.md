# Markdown Previewer

This binary helps you preview markdown files in the web with reloading support while watching for changes.

## Demo

![demo](./assets/preview.gif)

## Usage

```sh
md-previewer --file=path/to/file.md
```

## Neovim Plugin

- Installation:

```lua
-- lazy.nvim
{
  'datsfilipe/md-previewer',
  cmd = 'MdPreviewer',
  ft = 'markdown',
  build = 'bun install && bun compile',
  opts = {
    quiet = true, -- default is false but rn it has no real usage :0
  },
}

-- packer.nvim
use {
  'datsfilipe/md-previewer',
  cmd = 'MdPreviewer',
  ft = 'markdown',
  run = 'bun install && bun compile',
  config = function()
    require('md-previewer').setup({
      quiet = true, -- default is false but rn it has no real usage :0
    })
  end,
}
```

## Development

It's as any bun project, just run `bun ./index.ts --file=path/to/file.md` to preview a file. Tip: `bun compile` will generate the binaries, if the `bin` dir exists, `index.ts` will look for the compiled server instead of the `server.ts`.

- Neovim Plugin:

I'm using [direnv](https://direnv.net/) to manage some env vars for Neovim to load the plugin right away instead of the `init.lua` in your `~/.config/nvim` folder. You might want to look into it. To use direnv for this simple do `mv .envrc1 .envrc` and `direnv allow`.

- Any other enhancements are welcome :0

## License

MIT
