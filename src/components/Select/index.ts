import * as fs from 'fs'
import * as path from 'path'
import {guidGenerator} from '../Utils'

// @ts-nocheck

export type Params = {
  id ?:  string,
  path?: Array<string>,
  values?: Array<string>,
  link?: Array<string>,
  data?: Object
}

export const randomId = guidGenerator

const paramsStore : {[id: string] : Params} = {}

export const template = (params : Params) => {
  const id_g = params.id || guidGenerator()
  paramsStore[id_g] = {
    id : id_g,
    path : params.path ? [...params.path, id_g] : ['default', 'select', id_g],
    values : params.values || [],
    data: params.data || {}
  }
  return `<div
            class="${className()}"
            id="${id_g}"
          >
            SELECT_TEMPLATE
          </div>`
}

export const template_flat = (params : Params) => {
  const id_g = params.id || guidGenerator()
  paramsStore[id_g] = {
    id : id_g,
    path : params.path ? [...params.path, id_g] : ['default', 'select', 'id'],
    values : params.values || [],
    data: params.data || {}
  }
  return `<div class="${className()}" id="${id_g}"> SELECT_TEMPLATE </div>`
}

export const className = () => {
  return '__select'
}

export const render = (id: string, dynamic_id?) => {
  return `${className()}.state.render(${id}, ${dynamic_id})`
}

export const template_api = {
  enable: (id : string) => {
    return(`${className()}.state.api.enable('${id}')`)
  },
  disable: (id : string) => {
    return(`${className()}.state.api.disable('${id}')`)
  },
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