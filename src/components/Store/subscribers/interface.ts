import { Project } from '../../../project';

export interface Subcriber {
  action (path : Array<string>, message : any, data: any ) : void
  if_path (path : Array<string>, data: any) : boolean
  eq_path (path_1 : Array<string>, path_2: Array<string>) : boolean
  get (path : Array<string>)
  _project : Project
  _data : any
}

export class SubcriberClass implements Subcriber {

  constructor (project : Project, data : any) {
    this._project = project,
    this._data = data,
    this.action = this.action.bind(this)
    this.if_path = this.if_path.bind(this)
    this.eq_path = this.eq_path.bind(this)
    this.get = this.get.bind(this)
  }

  public _project : Project = null
  public _data : any = null

  public action(path, message, datay){
    return;
  }

  get(path : Array<string>){
    let obj = this._data
    if (this.if_path.bind(this)(path)){
      for (const it of path) {
        obj = obj[it]
      }
    }
    if (obj) return {...obj}
    return {}
  }

  public if_path(path : Array<string>, ){
    let res = false
    if (this._data && path) res = true
    let obj = this._data
    for (const dir of path){
      if(obj[dir] === undefined){
        res = false
        break;
      }
      obj = obj[dir]
    }
    return res
  }

  public eq_path(path_1 : Array<string>, path_2 : Array<string>){
    if (!path_1 || !path_2) return false
    if (path_2.length !== path_1.length) return false
    let result = true
    let counter = 0
    for( const p of path_1){
      if (p != path_2[counter]){
        result = false
        break
      }
      counter++
    }
    return result
  }


}