export enum Color {
  Black = 30,
  Red = 31,
  Green = 32,
  Yellow = 33,
  Blue = 34,
  Magenta = 35,
  Cyan = 36,
  White = 37,
  BrightBlack = 90,
  BrightRed = 91,
  BrightGreen = 92,
  BrightYellow = 93,
  BrightBlue = 94,
  BrightMagenta = 95,
  BrightCyan = 96,
  BrightWhite = 97,
}

const printText = (content: string, color: Color) => console.log(`\x1b[${color}m`, content, `\x1b[0m`)
const printBlock = (title: string, content: string, color: Color) => console.log(`\x1b[${color}m`, `${title}:`, `\x1b[0m`, content)
const printBlankLine = () => console.log()

export const print = {
  text: (content: string, color: Color = Color.White) => printText(content, color),
  block: (title: string, content: string, color: Color = Color.White) => printBlock(title, content, color),
  blankLine: () => printBlankLine(),
}
