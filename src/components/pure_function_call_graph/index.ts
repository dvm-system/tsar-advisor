import * as fs from 'fs'
import * as path from 'path'
import {guidGenerator} from '../Utils'

// @ts-nocheck

export type Params = {
  id ?:  string,
}

const paramsStore : {[id: string] : Params} = {}

export const template = (params : Params) => {
  const id_g = params.id || guidGenerator()
  paramsStore[id_g] = {
    id : id_g,
  }
  return `<div
            class="${className()}"
            id="${id_g}"
          >
            P_F TEMPLATE
          </div>`
}

export const className = () => {
  return '__pure_function_call_graph'
}

export const api_template = {
  set_func : function(id : string, func_id : string){
    return(`${className()}.state.api.set_func(${id}.id,${func_id})`)
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
          /__params/gi, JSON.stringify(
            Object.values(paramsStore).reduce((acc,cur) => {
              return ({...acc, [cur.id] : {...cur}})
            }, {})
          )
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