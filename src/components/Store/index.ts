import {Subcriber} from './subscribers/interface'
import { Project } from '../../project';
import { ProjectWebviewProviderState } from '../../webviewProvider';
import {JSONGeneratorSubscriber} from './subscribers/json_generator'

type subscribers_t = {[prefix : string] : Subcriber}
type components_t = Array<string>
type data_t = {[id : string] : any}


export class Store {

	private _debug = false
  private _project : Project = null
  private _data : data_t = {}
  private subscribers : subscribers_t = null

  constructor (project : Project) {
    this._project = project;
    this.subscribers = {
      'json_generator' : new JSONGeneratorSubscriber(this._project, this._data)
    }
    this.save = this.save.bind(this)
		this.load = this.load.bind(this)
    this.if_exists = this.load.bind(this)
    this.script_save_into_global_store = this.script_save_into_global_store.bind(this)
    this.script_restore_message = this.script_restore_message.bind(this)
    this.script_save_into_global_store = this.script_save_into_global_store.bind(this)
  }

	public save(path: Array<string>, data : any){

    if (this._debug)
      console.log('STORE.ADD:',(new Date()), path, data )

    let obj = this._data
    for (const dir of path.slice(0, -1)){
      if(!obj[dir]){
        obj[dir] = {}
      }
      obj = obj[dir]
    }
    obj[path[path.length - 1]] = {...obj[path[path.length - 1]], ...JSON.parse(JSON.stringify(data))};
    if (this.subscribers){
      Object.entries(this.subscribers).forEach(([s, upd])=>{
        if (path.includes(s))
          upd.action(path, data, this._data)
      })
    }

    if (this._debug)
      console.log('STORE.DATA:',(new Date()), this._data )
  }

  public if_exists( path : Array<string>){
    if (this._debug)
      console.log('STORE.IFEXISTS:',(new Date()), path )
    let obj = {...this._data}
    let res = false
    if (obj && path) res = true
    for (const dir of path){
      if(!obj[dir]){
        res = false
        break;
      }
      obj = obj[dir]
    }
    return res
  }

  public load( path : Array<string>){
    if (this._debug)
      console.log('STORE.LOAD:',(new Date()), path )
    let obj = {...this._data}
    if (this.if_exists(path)){
      for (const dir of path){
        obj = obj[dir]
      }
      return JSON.parse(JSON.stringify(obj))
    } else return null
  }

  public get(){
    return {...this._data}
  }

  public script_load_from_global_store(viewers : components_t, local_store?: boolean){
    return(`
    case '__store':
      ${viewers.map(el => `${el}.state.render(message.data)`).join('\n')}
      break;
    `)
  }

  public script_load_from_store(viewers : components_t, local_store?: boolean){
    return(`
    case '__store':
      ${viewers.map(el => `${el}.state.restore(message.data)`).join('\n')}
      break;
    `)
  }

  public script_save_into_global_store(key : string, path?:Array<string>, data?: any){
    if (key == '__store' && path && data)
      this.save(path, data)
  }

  public script_restore_message(){
    return({
      command : '__store',
      data : this._data
    })
  }

}