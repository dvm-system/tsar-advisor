import * as fs from 'fs'
import * as path from 'path'

export const template = (id:string) => {
  return `
    <div
      class="pure_function_call_graph"
      id="${id}"
    >
      pure_function_call_graph
    </div>
  `
}

export const id = () => {
  return 'pure_function_call_graph'
}


export const script = () => {
  return `
    <script>
      ${fs.readFileSync(path.resolve(__dirname, 'component.js'),"utf8")}
    </script>
  `
}