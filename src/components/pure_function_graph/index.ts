import * as fs from 'fs'
import * as path from 'path'

export const template = (id:string) => {
  return `<div class="pure_function" id="${id}">pure_function TEMPLATE</div>`
}

export const id = () => {
  return 'pure_function'
}

export const script = () => {
  return `<script> ${fs.readFileSync(path.resolve(__dirname, 'component.js'),"utf8")} </script>`
}