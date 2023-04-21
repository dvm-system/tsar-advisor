import * as fs from 'fs'
import * as path from 'path'
import {guidGenerator} from '../Utils'

// @ts-nocheck

export type Params = {
  id ?:  string,
  path?: Array<string>,
  data?: any
}

export const randomId = guidGenerator

const paramsStore : {[id: string] : Params} = {}

export const template = (params : Params) => {
  const id_g = params.id || guidGenerator()
  paramsStore[id_g] = {
    id : id_g,
    path : params.path ? [...params.path, id_g] : ['default', 'checkboxes', id_g],
    data : params.data ? params.data : {}
  }
  return `<div
            class="${className()}"
            id="${id_g}"
          >
            CHECKBOX_TEMPLATE
          </div>`
}

export const template_flat = (params : Params) => {
  const id_g = params.id || guidGenerator()
  paramsStore[id_g] = {
    id : id_g,
    path : params.path ? [...params.path, id_g] : ['default', 'checkbox', 'id'],
    data : params.data ? params.data : {}
  }
  return `<div class="${className()}" id="${id_g}"> CHECKBOX_TEMPLATE </div>`
}

export const className = () => {
  return '__checkbox'
}

export const render = (id: string, dynamic_id?) => {
  return `${className()}.state.render(${id}, ${dynamic_id})`
}

export const template_api = {
  get: (id:string) => {
    return(`${className()}.state.api.get('${id}')`)
  }
}


export const script = (store = null) => {
  return (
    `<script>
      ${
        fs
        .readFileSync(path.resolve(__dirname, 'script.js'),"utf8")
        .replace(/__component/gi, className())
        .replace(
          /__params/gi, JSON.stringify(paramsStore)
        )
        .replace(/__init_store/gi, store ? JSON.stringify(store) : '{}')
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