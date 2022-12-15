import * as vscode from 'vscode';
import {Data as DataLoopTree} from '../loopTree'
import {FileListProvider, FileListProviderState} from '../fileList'
import { Project } from '../project';
import { ProjectWebviewProviderState } from '../webviewProvider';

interface Function {
  File: string,
  Line: number,
  Column: number,
  Name: string,
  Pure: boolean
}

export class Store {

	private _data = {}
  private _subscribe = [] as Array<{
    id : string,
    scheme : string
  }>
  private _local_store = false

  private _json_file_creating = false
  private _gen_json = {
    name : 'RawInfo',
    Functions : [] as Array<Function>,
    vars:[],
    Loops:[],
  }

	constructor () {
    this.add = this.add.bind(this)
		this.json_string = this.json_string.bind(this)
    this.subscribe = this.subscribe.bind(this)
    this.restore = this.restore.bind(this)
    this.get_store = this.get_store.bind(this)
    this.create_local_store = this.create_local_store.bind(this)
    this.save_as_json_sync_loop_tree = this.save_as_json_sync_loop_tree.bind(this)
    this.save_as_json_loop_tree = this.save_as_json_loop_tree.bind(this)
    // Get Function information

  }

	public add(path: Array<string>, data : any){
    let obj = this._data
    for (const dir of path.slice(0, -1)){
      if(!obj[dir]){
        obj[dir] = {}
      }
      obj = obj[dir]
    }
    //console.log('ADD:::', obj[path[path.length - 1]], JSON.parse(JSON.stringify(data)),{...obj[path[path.length - 1]], ...data} )
    obj[path[path.length - 1]] = {...obj[path[path.length - 1]], ...JSON.parse(JSON.stringify(data))};
    if (path.includes('json_generator'))
      vscode.commands.executeCommand('tsar.loopTree.update')
  }

	public json_string(){
		return JSON.stringify(this._data)
	}

  public init_local_store() {
    this._local_store = true
    return 'let _local_store = null'
  }

  public restore(){
    //console.log("RESTORE:::SUBSCRIBE:::",this._subscribe)
    return `case 'store':\n` +
      this._subscribe.map(el => `_${el.id}.state.render(message.store)`).join('\n') +
      (this._local_store ? `\n _local_store = message.store\n` : '') +
      `\nbreak;`
  }

  // public force_restore(){
  //   return `<script>
  //             ${this._subscribe.map(el => `_${el}.state.render(${JSON.stringify(this._data, null, 2)})`).join('\n')}
  //           </script>
  //           `
  // }



  public restore_message(){
    return {
      command: 'store',
      store: this._data
    }
  }

  public restore_func(project : Project){
    const schm = [...new Set(this._subscribe.map(e => e.scheme))]
    for (const s of schm) {
      const state = project.providerState(s) as ProjectWebviewProviderState<any>
      console.log('RESTORE:::',this._subscribe,schm, s,  state)
      state.panel.webview.postMessage(this.restore_message())
    }
  }

  public getPureFunctions(){
    if (
      this._data['json_generator'] &&
      this._data['json_generator']['pure_function'] &&
      this._data['json_generator']['pure_function']['check']
    ){
      return this._data['json_generator']['pure_function']['check'] as {[id: number] :  0 | 1 | 2 }
    } else return []
  }

  public save_as_json_sync_loop_tree(project, local_state : DataLoopTree){
    if (this._json_file_creating){
      return
    } else {
      this._json_file_creating = true
      this.save_as_json_loop_tree(project, local_state)
    }
  }

  public async save_as_json_loop_tree(project : Project, local_state : DataLoopTree){
  const fileState = project.providerState(FileListProvider.scheme) as FileListProviderState
  console.log('DEBUG:::save_as_json_loop_tree:::', this._data, local_state)
  if (
      this._data['json_generator'] &&
      this._data['json_generator']['pure_function'] &&
      this._data['json_generator']['pure_function']['check']
  ){
    const d = Object.entries(this._data['json_generator']['pure_function']['check']);
    d.forEach(([id, val]) => {
      const f = local_state.FunctionList.Functions.find((v) => v.ID === +id)
      if (f){
        //console.log('d:', id, val, f, local_state.FunctionList.Functions);
        if (val == 0)
          this._gen_json.Functions = [...this._gen_json.Functions.filter(v => v.Name != f.Name)]
        if (val == 1){
          let jf = this._gen_json.Functions.find(v => v.Name == f.Name)
          if (jf){
            jf = {...jf, Pure : true}
          } else {
            this._gen_json.Functions = [...this._gen_json.Functions, {
              Pure: true,
              Name: f.Name,
              Column: f.StartLocation.Column,
              File: fileState.getFile(f.StartLocation.File).Name,
              Line: f.StartLocation.Line
            }]
          }
        }
        if (val == 2){
          let jf = this._gen_json.Functions.find(v => v.Name == f.Name)
          if (jf){
            jf = {...jf, Pure : false}
          } else {
            this._gen_json.Functions = [...this._gen_json.Functions, {
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
  vscode.env.clipboard.readText().then(c => {
    vscode.env.clipboard.writeText(JSON.stringify(this._gen_json, null, 2)).then(d => {
      console.log('WRITE_DATA:::',this._gen_json,JSON.stringify(this._gen_json, null, 2))
      vscode.commands.executeCommand('workbench.action.files.newUntitledFile').then(u => {
        vscode.commands.executeCommand('editor.action.clipboardPasteAction').then(u => {
          vscode.env.clipboard.writeText(c).then(u => {
            this._json_file_creating = false
          })
        })
      });
      })
    });
  }

  public subscribe(id:string, scheme:string){
    this._subscribe.push({
      id,
      scheme,
    })
    return;
  }

  public get_store(){
    return this._data
  }

  public create_local_store(){
    this._local_store = true
    return `let _Store = {}`
  }

}