import * as fs from 'fs'
import * as path from 'path'
import {guidGenerator} from '../Utils'

export const template = (id?:string) => {
  return `<div
            class="${className()}"
            id="${id || guidGenerator()}"
          >
            P_F TEMPLATE
          </div>`
}

export const className = () => {
  return '__pure_function'
}

export const script = () => {
  return (
    `<script>
      ${
        fs
        .readFileSync(path.resolve(__dirname, 'script.js'),"utf8")
        .replace(/__component/gi, className())
      }
    </script>`)
}

export const style = () => {
  return (
    `<style type="text/css" media="screen">
      ${
        fs
        .readFileSync(path.resolve(__dirname, 'style.css'),"utf8")
        .replace(/__component/gi, className())
      }
    </style>`)
}