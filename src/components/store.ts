import * as vscode from 'vscode';

export class Store {

	private _data = {}
  private _subscribe = [] as Array<string>
  private _local_store = false

  private _json_file_creating = false

	constructor () {
    this.add = this.add.bind(this)
		this.json_string = this.json_string.bind(this)
    this.subscribe = this.subscribe.bind(this)
    this.restore = this.restore.bind(this)
    this.get_store = this.get_store.bind(this)
    this.create_local_store = this.create_local_store.bind(this)
    this.save_as_json_sync = this.save_as_json_sync.bind(this)
    this.save_as_json = this.save_as_json.bind(this)
  }

	public add(path: Array<string>, data : any){
    let obj = this._data
    for (const dir of path.slice(0, -1)){
      if(!obj[dir]){
        obj[dir] = {}
      }
      obj = this._data[dir]
    }
    obj[path[path.length - 1]] = JSON.parse(JSON.stringify(data));
    //console.log('ADD:::', path, data, this._data)
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
      this._subscribe.map(el => `_${el}.state.render(message.store)`).join('\n') +
      (this._local_store ? `\n _local_store = message.store\n` : '') +
      `\nbreak;`
  }

  public restore_command(){
    //console.log("RESTORE:::",this._data)
    return {
      command: 'store',
      store: this._data
    }
  }

  public save_as_json_sync(){
    if (this._json_file_creating){
      return
    } else {
      this._json_file_creating = true
      this.save_as_json()
    }
  }

  public async save_as_json(){
  console.log('LABADABADU', this._data)
  const writeData = {
    pure_function :
      this._data['json_generator']
      ?
        this._data['json_generator']['pure_function']
        ?
        this._data['json_generator']['pure_function']
        :
        []
      :
    [],
  }
  vscode.env.clipboard.readText().then(c => {
    vscode.env.clipboard.writeText(JSON.stringify(writeData, null, 2)).then(d => {
      console.log('WRITE_DATA:::',writeData,JSON.stringify(writeData, null, 2))
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

  public subscribe(id:string){
    this._subscribe.push(id)
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