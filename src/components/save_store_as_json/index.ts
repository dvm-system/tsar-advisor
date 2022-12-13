import * as fs from 'fs'
import * as path from 'path'

export const template = (id:string) => {
  return `<div class="save_store_as_json" id="${id}">save_store_as_json TEMPLATE</div>`
}

export const id = () => {
  return 'save_store_as_json'
}

export const script = () => {
  return `<script> ${fs.readFileSync(path.resolve(__dirname, 'component.js'),"utf8")} </script>`
}
