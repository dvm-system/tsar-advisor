import * as vscode from 'vscode';
import { Project } from '../../../project';
import {FileListProvider, FileListProviderState} from '../../../fileList'
import * as msg from '../../../messages';

import {SubcriberClass} from './interface'

interface Function {
  File: string,
  Line: number,
  Column: number,
  Name: string,
  Pure: boolean
}

interface Var {
  File: string,
  Line: number,
  Column: number,
  Name: string
}

export class JSONGeneratorSubscriber extends SubcriberClass {

  constructor (project : Project, data : any) {
    super(project, data);
    this.action = this.action.bind(this)
    this.create_file = this.create_file.bind(this)
  }

  public json_file = {
    Name : 'JSON',
    Functions : [] as Array<Function>,
    Vars : [] as Array<Var>,
    Loop : []
  }

  public flags = {
    creating : false
  }

  public action (path : Array<string>, message : any ) {
    if (this.eq_path(path,['json_generator', '__store_to_json'])){
      this.create_file()
    }

  }

  private create_file (){
    if (this.flags.creating) return;
    this.flags.creating = true
    //console.log('Action', this._data)
    const p = ['json_generator', '__pure_function']
    const fp = ['global', 'function_list']
    const fileState = this._project.providerState(FileListProvider.scheme) as FileListProviderState
    if (this.if_path(p) && this.if_path(fp)){
      const d = Object.entries(this.get(p));
      const fd : Array<msg.Function> = Object.values(this.get(fp))
      d.forEach(([id, val]) => {
        const f = fd.find((v) => v.ID === +id)
        if (f){
          //console.log('d:', id, val, f, local_state.FunctionList.Functions);
          if (val == 0)
            this.json_file.Functions = [...this.json_file.Functions.filter(v => v.Name != f.Name)]
          if (val == 1){
            let jf = this.json_file.Functions.find(v => v.Name == f.Name)
            if (jf){
              jf = {...jf, Pure : true}
            } else {
              this.json_file.Functions = [...this.json_file.Functions, {
                Pure: true,
                Name: f.Name,
                Column: f.StartLocation.Column,
                File: fileState.getFile(f.StartLocation.File).Name,
                Line: f.StartLocation.Line
              }]
            }
          }
          if (val == 2){
            let jf = this.json_file.Functions.find(v => v.Name == f.Name)
            if (jf){
              jf = {...jf, Pure : false}
            } else {
              this.json_file.Functions = [...this.json_file.Functions, {
                Pure: false,
                Name: f.Name,
                Column: f.StartLocation.Column,
                File: fileState.getFile(f.StartLocation.File).Name,
                Line: f.StartLocation.Line
              }]
            }
          }
        }
      })
    }

    // Loops
    const loops = {}
    const path_functions = ['global', 'function_list']
    if (this.if_path(path_functions)){
      for (const func of (Object.values(this.get(path_functions)) as Array<msg.Function>)) {
        if (func.Loops){
          for (const loop of func.Loops) {
            loops[loop.ID] = loop
          }
        }
      }
    }

    //Options&Variables
    const options = {}
    let nodes = [] as Array<msg.AliasNode>
    let unsing_nodes = [] as Array<number>
    const vars = {} as {[id: number]: Array<{File: string, Line: number, Column: number, Name: string,ID: number}>}
    const path_nodes = ['global', 'vars']
    if (this.if_path(path_nodes)){
      nodes = this.get(path_nodes) || {}
      for (const node of Object.values(nodes)) {
        vars[node.ID] = node.SelfMemory.map(e => ({
          'File': e.Locations[0] ? fileState.getFile(e.Locations[0].File).Name : null,
          'Line': e.Locations[0] ? e.Locations[0].Line : null,
          'Column' : e.Locations[0] ? e.Locations[0].Column : null,
          'Name' : e.Object.Name,
          'ID': e.Object.ID,
        }))
      }
    }

    //console.log('VARS',vars)
    //Write Occured
    const path_write_ocured = ['json_generator', 'alias_tree', 'write_occured', 'alias_tree_checkbox_write_ocured']
    if (this.if_path(path_write_ocured)){
      for (const [key, wo] of (Object.entries(this.get(path_write_ocured)) as [string, {key: number, loop_id: number, state:boolean}][])) {
        if (wo.state){
          unsing_nodes.push(wo.key)
          if (!options[wo.loop_id])
            options[wo.loop_id] = {}
          if(!options[wo.loop_id]['WriteOccured'])
            options[wo.loop_id]['WriteOccured'] = [] as Array<number>
          if (!(options[wo.loop_id]['WriteOccured']as Array<number>).includes(wo.key)){
            const varr = vars[wo.key] || []
            for (const v of varr) {
              options[wo.loop_id]['WriteOccured'].push(v.ID)
            }
          }

        }
        //console.log('LOOPS:::', loops,'OPTIONS:', options,'nodes:', nodes, 'FROM:',wo)
      }
    }
    //Read Occured
    const path_read_ocured = ['json_generator', 'alias_tree', 'read_occured', 'alias_tree_checkbox_read_ocured']
    if (this.if_path(path_read_ocured)){
      for (const [key, wo] of (Object.entries(this.get(path_read_ocured)) as [string, {key: number, loop_id: number, state:boolean}][])) {
        if (wo.state){
          unsing_nodes.push(wo.key)
          if (!options[wo.loop_id])
            options[wo.loop_id] = {}
          if(!options[wo.loop_id]['ReadOccured'])
            options[wo.loop_id]['ReadOccured'] = [] as Array<number>
          if (!(options[wo.loop_id]['ReadOccured']as Array<number>).includes(wo.key)){
            const varr = vars[wo.key] || []
            for (const v of varr) {
              options[wo.loop_id]['ReadOccured'].push(v.ID)
            }
          }
        }
        //console.log('LOOPS:::', loops,'OPTIONS:', options,'nodes:', nodes, 'FROM:',wo)
      }
    }
    //Private
    const path_private = ['json_generator', 'alias_tree', 'private', 'alias_tree_checkbox_private']
    if (this.if_path(path_private)){
      for (const [key, wo] of (Object.entries(this.get(path_private)) as [string, {key: number, loop_id: number, state:boolean}][])) {
        if (wo.state){
          unsing_nodes.push(wo.key)
          if (!options[wo.loop_id])
            options[wo.loop_id] = {}
          if(!options[wo.loop_id]['Private'])
            options[wo.loop_id]['Private'] = [] as Array<number>
          if (!(options[wo.loop_id]['Private']as Array<number>).includes(wo.key)){
            const varr = vars[wo.key] || []
            for (const v of varr) {
              options[wo.loop_id]['Private'].push(v.ID)
            }
          }
        }
        //console.log('LOOPS:::', loops,'OPTIONS:', options,'nodes:', nodes, 'FROM:',wo)
      }
    }
    //UseAfterLoop
    const path_use_after_loop = ['json_generator', 'alias_tree', 'use_after_loop', 'alias_tree_checkbox_use_after_loop']
    if (this.if_path(path_use_after_loop)){
      for (const [key, wo] of (Object.entries(this.get(path_use_after_loop)) as [string, {key: number, loop_id: number, state:boolean}][])) {
        if (wo.state){
          unsing_nodes.push(wo.key)
          if (!options[wo.loop_id])
            options[wo.loop_id] = {}
          if(!options[wo.loop_id]['UseAfterLoop'])
            options[wo.loop_id]['UseAfterLoop'] = [] as Array<number>
          if (!(options[wo.loop_id]['UseAfterLoop']as Array<number>).includes(wo.key)){
            const varr = vars[wo.key] || []
            for (const v of varr) {
              options[wo.loop_id]['UseAfterLoop'].push(v.ID)
            }
          }
        }
        //console.log('LOOPS:::', loops,'OPTIONS:', options,'nodes:', nodes, 'FROM:',wo)
      }
    }
    //DefBeforeLoop
    const path_def_before_loop = ['json_generator', 'alias_tree', 'def_before_loop', 'alias_tree_checkbox_def_before_loop']
    if (this.if_path(path_def_before_loop)){
      for (const [key, wo] of (Object.entries(this.get(path_def_before_loop)) as [string, {key: number, loop_id: number, state:boolean}][])) {
        if (wo.state){
          unsing_nodes.push(wo.key)
          if (!options[wo.loop_id])
            options[wo.loop_id] = {}
          if(!options[wo.loop_id]['DefBeforeLoop'])
            options[wo.loop_id]['DefBeforeLoop'] = [] as Array<number>
          if (!(options[wo.loop_id]['DefBeforeLoop']as Array<number>).includes(wo.key)){
            const varr = vars[wo.key] || []
            for (const v of varr) {
              options[wo.loop_id]['DefBeforeLoop'].push(v.ID)
            }
          }
        }
        //console.log('LOOPS:::', loops,'OPTIONS:', options,'nodes:', nodes, 'FROM:',wo)
      }
    }
    //Reduction
    const path_reduction = ['json_generator', 'alias_tree', 'reduction', 'alias_tree_checkbox_reduction']
    const path_reduction_select = ['json_generator', 'alias_tree', 'reduction', 'alias_tree_select_reduction']
    if (this.if_path(path_reduction)){
      let select = null
      if (this.if_path(path_reduction_select))
        select = this.get(path_reduction_select)
      for (const [key, wo] of (Object.entries(this.get(path_reduction)) as [string, {key: number, loop_id: number, state:boolean}][])) {
        if (wo.state){
          unsing_nodes.push(wo.key)
          if (!options[wo.loop_id])
            options[wo.loop_id] = {}
          if(!options[wo.loop_id]['Reduction'])
            options[wo.loop_id]['Reduction'] = [] as Array<{[id:number] : string | null}>
          if (!(options[wo.loop_id]['Reduction'].map(e => Object.keys(e)[0])).includes(wo.key)){
            const d = select ? select[wo.key] : null
            const varr = vars[wo.key] || []
            for (const v of varr) {
              options[wo.loop_id]['Reduction'].push({[v.ID]: d ? d.value : null})
            }
          }
        }
        //console.log('LOOPS:::', loops,'OPTIONS:', options,'nodes:', nodes, 'FROM:',wo)
      }
    }
    // Induction
    const path_induction = ['json_generator', 'alias_tree', 'induction', 'alias_tree_checkbox_induction']
    const path_induction_from = ['json_generator', 'alias_tree', 'induction', 'alias_tree_input_induction_from']
    const path_induction_to = ['json_generator', 'alias_tree', 'induction', 'alias_tree_input_induction_to']
    const path_induction_step = ['json_generator', 'alias_tree', 'induction', 'alias_tree_input_induction_step']
    if (this.if_path(path_induction)){
      let from = null
      let to = null
      let step = null
      if (this.if_path(path_induction_from))
        from = this.get(path_induction_from)
      if (this.if_path(path_induction_to))
        to = this.get(path_induction_to)
      if (this.if_path(path_induction_step))
        step = this.get(path_induction_step)
      for (const [key, wo] of (Object.entries(this.get(path_induction)) as [string, {key: number, loop_id: number, state:boolean}][])) {
        if (wo.state){
          unsing_nodes.push(wo.key)
          if (!options[wo.loop_id])
            options[wo.loop_id] = {}
          if(!options[wo.loop_id]['Induction'])
            options[wo.loop_id]['Induction'] = [] as Array<{[id:number] : {"Start": number, "End": number, "Step": number}}>
          if (!(options[wo.loop_id]['Induction'].map(e => Object.keys(e)[0])).includes(wo.key)){
            const f = from ? from[wo.key] : null
            const t = to ? to[wo.key] : null
            const s = step ? step[wo.key] : null
            const f_v = f ? parseInt(f.value,10) || null : null
            const t_v = t ? parseInt(t.value,10) || null : null
            const s_v = s ? parseInt(s.value,10) || null : null
            const varr = vars[wo.key] || []
            for (const v of varr) {
              options[wo.loop_id]['Induction'].push({[v.ID]: {
                "Start": f_v ? Math.trunc(f_v) : null,
                "End": t_v ? Math.trunc(t_v) : null,
                "Step": s_v ? Math.trunc(s_v) : null
              }})
            }
          }
        }
      }
    }
    // Flow
    const path_flow = ['json_generator', 'alias_tree', 'flow', 'alias_tree_checkbox_flow']
    const path_flow_max= ['json_generator', 'alias_tree', 'flow', 'alias_tree_input_flow_max']
    const path_flow_min = ['json_generator', 'alias_tree', 'flow', 'alias_tree_input_flow_min']
    if (this.if_path(path_flow)){
      let max = null
      let min = null
      if (this.if_path(path_flow_max))
        max = this.get(path_flow_max)
      if (this.if_path(path_flow_min))
        min = this.get(path_flow_min)
      for (const [key, wo] of (Object.entries(this.get(path_flow)) as [string, {key: number, loop_id: number, state:boolean}][])) {
        if (wo.state){
          unsing_nodes.push(wo.key)
          if (!options[wo.loop_id])
            options[wo.loop_id] = {}
          if(!options[wo.loop_id]['Flow'])
            options[wo.loop_id]['Flow'] = [] as Array<{[id:number] : {"Max": number, "Min": number}}>
          if (!(options[wo.loop_id]['Flow'].map(e => Object.keys(e)[0])).includes(wo.key)){
            const x = max ? max[wo.key] : null
            const n = min ? min[wo.key] : null
            const x_v = x ? parseInt(x.value,10) || null : null
            const n_v = n ? parseInt(n.value,10) || null : null
            const varr = vars[wo.key] || []
            for (const v of varr) {
              options[wo.loop_id]['Flow'].push({[v.ID]: {
                "Max": x_v ? (Math.trunc(x_v) >= 0? Math.trunc(x_v) : null) : null,
                "Min": n_v ? (Math.trunc(n_v) >= 0? Math.trunc(n_v) : null) : null,
              }})
            }
          }
        }
      }
    }
    // Anti
    const path_anti = ['json_generator', 'alias_tree', 'anti', 'alias_tree_checkbox_anti']
    const path_anti_max= ['json_generator', 'alias_tree', 'anti', 'alias_tree_input_anti_max']
    const path_anti_min = ['json_generator', 'alias_tree', 'anti', 'alias_tree_input_anti_min']
    if (this.if_path(path_anti)){
      let max = null
      let min = null
      if (this.if_path(path_anti_max))
        max = this.get(path_anti_max)
      if (this.if_path(path_anti_min))
        min = this.get(path_anti_min)
      for (const [key, wo] of (Object.entries(this.get(path_anti)) as [string, {key: number, loop_id: number, state:boolean}][])) {
        if (wo.state){
          unsing_nodes.push(wo.key)
          if (!options[wo.loop_id])
            options[wo.loop_id] = {}
          if(!options[wo.loop_id]['Anti'])
            options[wo.loop_id]['Anti'] = [] as Array<{[id:number] : {"Max": number, "Min": number}}>
          if (!(options[wo.loop_id]['Anti'].map(e => Object.keys(e)[0])).includes(wo.key)){
            const x = max ? max[wo.key] : null
            const n = min ? min[wo.key] : null
            const x_v = x ? parseInt(x.value,10) || null : null
            const n_v = n ? parseInt(n.value,10) || null : null
            const varr = vars[wo.key] || []
            for (const v of varr) {
              options[wo.loop_id]['Anti'].push({[v.ID]: {
                "Max": x_v ? (Math.trunc(x_v) >= 0? Math.trunc(x_v) : null) : null,
                "Min": n_v ? (Math.trunc(n_v) >= 0? Math.trunc(n_v) : null) : null,
              }})
            }
          }
        }
      }
    }
    // Output
    const path_output = ['json_generator', 'alias_tree', 'output', 'alias_tree_checkbox_output']
    const path_output_max= ['json_generator', 'alias_tree', 'output', 'alias_tree_input_output_max']
    const path_output_min = ['json_generator', 'alias_tree', 'output', 'alias_tree_input_output_min']
    if (this.if_path(path_output)){
      let max = null
      let min = null
      if (this.if_path(path_output_max))
        max = this.get(path_output_max)
      if (this.if_path(path_output_min))
        min = this.get(path_output_min)
      for (const [key, wo] of (Object.entries(this.get(path_output)) as [string, {key: number, loop_id: number, state:boolean}][])) {
        if (wo.state){
          unsing_nodes.push(wo.key)
          if (!options[wo.loop_id])
            options[wo.loop_id] = {}
          if(!options[wo.loop_id]['Output'])
            options[wo.loop_id]['Output'] = [] as Array<{[id:number] : {"Max": number, "Min": number}}>
          if (!(options[wo.loop_id]['Output'].map(e => Object.keys(e)[0])).includes(wo.key)){
            const x = max ? max[wo.key] : null
            const n = min ? min[wo.key] : null
            const x_v = x ? parseInt(x.value,10) || null : null
            const n_v = n ? parseInt(n.value,10) || null : null
            const varr = vars[wo.key] || []
            for (const v of varr) {
              options[wo.loop_id]['Output'].push({[v.ID]: {
                "Max": x_v ? (Math.trunc(x_v) >= 0? Math.trunc(x_v) : null) : null,
                "Min": n_v ? (Math.trunc(n_v) >= 0? Math.trunc(n_v) : null) : null,
              }})
            }
          }
        }
      }
    }
    // JSON
    for (const [key, option] of (Object.entries(options) as [string, Object][])) {
      const loop = (loops as {[id:number] : msg.Loop})[key] as msg.Loop
      this.json_file.Loop.push({
        "File": loop ? fileState.getFile(loop.StartLocation.File).Name : null,
        "Line": loop ? loop.StartLocation.Line : null,
        "Column": loop ? loop.StartLocation.Column : null,
        ...option,
      })
    }

    const already_using_variables = [] as Array<number>
    let json_string = JSON.stringify(this.json_file, null, 2)



    //console.log('Options=======>', options, unsing_nodes)
    unsing_nodes = Array.from(new Set(unsing_nodes))
    const json_vars = unsing_nodes.reduce((acc,key) => {
      const varr = vars[key]
      //console.log('VARR=======>', varr, acc, already_using_variables)
      if (varr) {
        for (const v of varr) {
          if (!already_using_variables.includes(v.ID)){
            acc.push({
              'File': v.File,
              'Line': v.Line,
              'Column' : v.Column,
              'Name' : v.Name,
            })
            already_using_variables.push(v.ID)
            const regexp = new RegExp(`${v.ID}`, 'g')
            json_string = json_string.replace(regexp, `${acc.length - 1}`)
            return acc
          } else {
            return acc
          }
        }
      } else {
        return acc
      }
    }, [])

    //console.log("json_vars",json_vars)
    const regexp = new RegExp(`"Vars": \\[\\]`, 'gi')
    json_string = json_string.replace(regexp, `"Vars": ${ JSON.stringify(json_vars, null, 2)}`)

    vscode.env.clipboard.readText().then(c => {
      vscode.env.clipboard.writeText(json_string).then(d => {
        vscode.commands.executeCommand('workbench.action.files.newUntitledFile').then(u => {
          vscode.commands.executeCommand('editor.action.clipboardPasteAction').then(u => {
            vscode.env.clipboard.writeText(c).then(u => {
              this.json_file = {
                Functions : [],
                Loop: [],
                Name: 'RawInfo',
                Vars:[]
              }
              this.flags.creating = false
            })
          })
        });
        })
      });
  }


}
