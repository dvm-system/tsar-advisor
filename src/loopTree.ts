//===- loopTree.ts --------------- Loop Tree Provider ------- TypeScript --===//
//
//                           TSAR Advisor (SAPFOR)
//
// This file implements provider to show list of functions in a project and
// a loop tree for each function. Some general trais are also shown.
//
//===----------------------------------------------------------------------===//


import * as vscode from 'vscode';
import {headHtml, UpdateUriFunc, commandLink,
  DisposableLikeList, isFunction} from './functions';
import { gotoExpansionLocLink } from './fileList';
import * as log from './log';
import * as msg from './messages';
import {Project, ProjectEngine} from './project';
import {ProjectWebviewProviderState,
  ProjectWebviewProvider} from './webviewProvider';

import * as PureFunction from './components/pure_function/index'
import * as StoreToJSON from './components/store_to_json'

export function registerCommands(engine: ProjectEngine, subscriptions: DisposableLikeList) {
  let showFuncList = vscode.commands.registerCommand('tsar.function.list',
    (uri:vscode.Uri) => {
      let project = engine.project(uri);
      let state = project.providerState(LoopTreeProvider.scheme);
      state.active = true;
      project.focus = state;
      let request = new msg.FunctionList;
      if (!state.actual(request))
        project.send(request);
    });
  let showLoopTree = vscode.commands.registerCommand('tsar.loop.tree',
    (uri:vscode.Uri) => {
      let project = engine.project(uri);
      let state = project.providerState(LoopTreeProvider.scheme);
      state.active = true;
      project.focus = state;
      let looptree = new msg.LoopTree;
      let query = JSON.parse(uri.query);
      looptree.FunctionID = query.ID;
      if (!state.actual(looptree))
        project.send(looptree);
    });
  subscriptions.push(showFuncList, showLoopTree);
 }

interface Info {
  ShowSubtree: boolean;
  Function: msg.Function;
};

export interface Data {
  FunctionList: msg.FunctionList;
  Info: Map<msg.Function|msg.Loop,Info>;
  Configuration: {
    sort_key : SortKey,
    sort_type : SortType,
    sort_conf : "Yes" | 'No'
  }
  store :  {}
};

export type SortKey = 'Parallel' | 'Canonical' | 'Perfect' | 'Exit' | 'IO' | 'Readonly' | 'UnsafeCFG' | 'NoSort'
export type SortType = 'ASC' | 'DESC'



export const DefaultSortDESC = (a : msg.Function | msg.Loop & {Name : string}, b: msg.Function | msg.Loop & {Name : string}) => {
  if (a.StartLocation.Line > b.StartLocation.Line) return 1
  if (a.StartLocation.Line < b.StartLocation.Line) return -1
  if (a.StartLocation.Column > b.StartLocation.Column ) return 1
  if (a.StartLocation.Column < b.StartLocation.Column ) return -1
  if (a.Name > b.Name ) return 1
  if (a.Name < b.Name ) return -1
  return 0
}

export const DefaultSortASC = (a : msg.Function | msg.Loop & {Name : string}, b: msg.Function | msg.Loop & {Name : string}) => {
  if (a.StartLocation.Line > b.StartLocation.Line) return -1
  if (a.StartLocation.Line < b.StartLocation.Line) return 1
  if (a.StartLocation.Column > b.StartLocation.Column ) return -1
  if (a.StartLocation.Column < b.StartLocation.Column ) return 1
  if (a.Name > b.Name ) return -1
  if (a.Name < b.Name ) return 1
  return 0
}

export const BoolSort = (a : string,  b: string, type : SortType) => {
  if (a === 'Yes' && type == 'DESC') return -1
  if (a === 'Yes' && type == 'ASC') return 1
  if (b === 'Yes' && type == 'DESC' ) return 1
  if (b=== 'Yes' && type == 'ASC' ) return -1
  return 0
}

export const ExitSort = (a : number, b: number, type : SortType) => {
  if (a == null) return 1
  if (b == null) return -1
  if (a > b && type == 'DESC') return -1
  if (a > b && type == 'ASC') return 1
  if (a < b && type == 'DESC') return 1
  if (a < b && type == 'ASC') return -1
  return 0
}

export class LoopTreeProviderState extends ProjectWebviewProviderState<LoopTreeProvider> {

  public functions() {
    return (this.data !== undefined)
      ? (this.data as Data).FunctionList.Functions
      : undefined;
  }

  actual(request: any): boolean {
    if (request instanceof msg.FunctionList)
      return this.data !== undefined;
    if (request instanceof msg.LoopTree) {
      let f = (this._data as Data).FunctionList.Functions.find(
        f => { return f.ID == request.FunctionID});
      return f === undefined ||
        (f.Loops != undefined && f.Loops.length > 0);
    }
    return false;
  }

  openSortConf(current : 'Yes'| 'No'){
    if (current == 'Yes'){
      (this._data as Data).Configuration.sort_conf = 'No'
    } else {
      (this._data as Data).Configuration.sort_conf = 'Yes'
    }
  }

  getSortConfiguration(){
    return {
      type : ( this._data as Data ).Configuration.sort_type,
      key : ( this._data as Data ).Configuration.sort_key,
      open : ( this._data as Data ).Configuration.sort_conf,
    }
  }

  onResponse(response: any): Thenable<any> {
    return new Promise(resolve => {
      if (response !== undefined) {
        if (response instanceof msg.FunctionList) {

          this._data = {
            FunctionList: response,
            Info: new Map<any, Info>(),
            Configuration:  {
              sort_key : 'NoSort',
              sort_type : 'DESC',
              sort_conf : 'No'
            },
            store : {}
          };
        } else if (this._data != undefined) {
          // Add loop tree to the function representation.
          let looptree = response as msg.LoopTree;
          this._data = {
            ...this._data,
          }
          for (let f of (this._data as Data).FunctionList.Functions) {
            if (f.ID != looptree.FunctionID)
              continue;
            f.Loops = looptree.Loops;
            this.setSubtreeHidden(false, f);
            break;
          }
        }
      }
      resolve(this._data !== undefined
        ? (this._data as Data).FunctionList
        : undefined);
    });
  }

  // public add_state_to_store(path: Array<string>, data : any){
  //   let obj = (this._data as Data).store
  //   for (const dir of path.slice(0,-1)){
  //     if(!obj[dir]){
  //       obj[dir] = {}
  //     }
  //     obj = obj[dir]
  //   }
  //   obj[path[path.length - 1]] = data
  // }


  public setSortParam(key : SortKey = 'NoSort', type : SortType = 'DESC'){
    if (key){
      (this._data as Data).Configuration.sort_key = key;
    }
    if (type){
      (this._data as Data).Configuration.sort_type = type;
    }
  }

  public sortFunction(key : SortKey = 'NoSort', type : SortType = 'DESC'){
    this._data.FunctionList.Functions = (this._data as Data).FunctionList.Functions
    .map(fun=>{
      if (fun.Traits.Loops == 'Yes'){
        return {
          ...fun,
          Loops : fun.Loops
          .map(L=>{ return {...L, Name : fun.Name} as msg.Loop & {Name : string}})
          .sort((a, b) => {
            switch (key){
              case 'NoSort' :
                return type == 'ASC' ? DefaultSortASC(a,b) : DefaultSortDESC(a,b)
              case 'Parallel':
                return BoolSort(a.Traits.Parallel, b.Traits.Parallel, type)
              case 'IO':
                return BoolSort(a.Traits.InOut, b.Traits.InOut, type)
              case 'Canonical':
                return BoolSort(a.Traits.Canonical, b.Traits.Canonical, type)
              case 'Perfect':
                return BoolSort(a.Traits.Perfect, b.Traits.Perfect, type)
              case 'UnsafeCFG':
                return BoolSort(a.Traits.UnsafeCFG, b.Traits.UnsafeCFG, type)
              case 'Exit':
                return ExitSort(a.Exit,b.Exit, type)
              default: return 0
            }
          })
        }
      } else return fun
    })
    .sort((a,b)=>{
      switch (key){
        case 'NoSort' :
          return type == 'ASC' ? DefaultSortASC(a,b) : DefaultSortDESC(a,b)
        case 'Parallel':
          return BoolSort(a.Traits.Parallel, b.Traits.Parallel, type)
        case 'IO':
          return BoolSort(a.Traits.InOut, b.Traits.InOut, type)
        case 'Readonly':
          return BoolSort(a.Traits.Readonly, b.Traits.Readonly, type)
        case 'UnsafeCFG':
          return BoolSort(a.Traits.UnsafeCFG, b.Traits.UnsafeCFG, type)
        case 'Exit':
          return ExitSort(a.Exit,b.Exit, type)
        default: return 0
      }
    })
  }

  public setSubtreeHidden(hidden: boolean, f: msg.Function, l: msg.Loop = undefined) {
    let key = l === undefined ? f : l;
    let info = (this._data as Data).Info.get(key);
    if (info === undefined)
      (this._data as Data).Info.set(key, {ShowSubtree: !hidden, Function: f});
    else
      info.ShowSubtree = !hidden;
  }

  public isSubtreeHidden(obj: msg.Function|msg.Loop): boolean {
    let info = (this._data as Data).Info.get(obj);
    return info === undefined || !info.ShowSubtree;
  }
}


export class LoopTreeProvider extends ProjectWebviewProvider {
  static scheme = "tsar-looptree";

  public scheme(): string { return LoopTreeProvider.scheme; }

  public state(): LoopTreeProviderState {
    return new LoopTreeProviderState(this);
  }

  clear(project: Project) {
  }

  protected _title(): string { return log.FunctionList.title; }

  protected _needToHandle(response: any): boolean {
    return response instanceof msg.FunctionList ||
      response instanceof msg.LoopTree;
  }

  protected _provideContent(
    project: Project,
    funclst: msg.FunctionList,
    asWebviewUri: UpdateUriFunc
  ): string {

    let state = project.providerState(
      LoopTreeProvider.scheme) as LoopTreeProviderState;
    this._registerListeners(project, state, funclst);
    project.component_store.save(['global', 'function_list'], funclst.Functions)

      // Subcribe component
      // project.component_store.subscribe(PureFunction.id(), LoopTreeProvider.scheme)
      // project.component_store.subscribe(SaveStoreAsJSON.id(), LoopTreeProvider.scheme)

    let aliasTree = {
      command: 'tsar.loop.alias',
      project: project,
      title: log.AliasTree.build,
      body: '&#10070;',
      query: {}
    };
    let linkCallees = {
      command: 'tsar.callee.func',
      project: project,
      title: log.CallGraph.from,
      body: '&#10167;',
      query: {Attr: []}
    };
    let linkInOut = {
      command: 'tsar.callee.func',
      project: project,
      title: log.CallGraph.io,
      body: '',
      query: {Attr: [msg.StatementAttr.InOut]}
    };
    let linkUnsafeCFG = {
      command: 'tsar.callee.func',
      project: project,
      title: log.CallGraph.unsafeCFG,
      body: '',
      query: {Attr: [msg.StatementAttr.UnsafeCFG]}
    };
    let linkExit = {
      command: 'tsar.callee.func',
      project: project,
      title: log.CallGraph.exit,
      body: '',
      query: {Attr: [msg.StatementAttr.Exit]}
    };
    let body = `
    <!doctype html>
    <html lang="en">
      ${headHtml(asWebviewUri)}
      <body>`;
    body += `
    <script>
      const vscode = acquireVsCodeApi();
      window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
          case 'Subtree':
            const id = '#loopTree-' + message.func +
              ('loop' in message ? '-' + message.loop : '');
            if (message.hide === 'true')
              $(id).collapse('hide');
            else
              $(id).collapse('show');
          break;
          ${
            project.component_store.script_load_from_global_store([
              PureFunction.className(),
              StoreToJSON.className()
            ])
          }
          case 'Sort':
            //const test_text = document.getElementById('test_text')
            //test_text.style.color = 'red'

            const conf_sort_button = document.getElementById('config-button')
            const sort_config = document.getElementById('sort-config')
            const conf_sort_asc = document.getElementById('conf_sort_asc')
            const conf_sort_desc = document.getElementById('conf_sort_desc')
            const select_config_key = document.getElementById('select_config_key')

            if (message.open == 'Yes'){
              conf_sort_button.classList.add("orange");
              sort_config.classList.remove("d-none");
              sort_config.classList.add("d-flex");
            } else {
              conf_sort_button.classList.remove("orange");
              sort_config.classList.remove("d-flex");
              sort_config.classList.add("d-none");
            }

            if (message.type == 'ASC'){
              conf_sort_desc.classList.remove("background_orange")
              conf_sort_asc.classList.add("background_orange");
            } else {
              conf_sort_asc.classList.remove("background_orange")
              conf_sort_desc.classList.add("background_orange");
            }

            select_config_key.value = message.key;

            break;
        }
      });
    </script>`;
    body +=`
    </div>
      <div class="row font-weight-bolder border-bottom py-3 text-center align-items-center">
        <div class="col-4 border-right">
          <div class = "d-flex justify-content-between align-items-center">
            <div id="test_text"> Functions and Loops </div>
            <div class="btn-group ml-4" role="group" >
             ${StoreToJSON.template()}
              <button type="button" id="sort-button" class="btn btn-priamry  btn-sm " title="Sort items" data-toggle="tooltip" data-placement="bottom">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  class="bi bi-sort-up"
                  viewBox = "0 0 16 16"
                >
                <path d="M3.5 12.5a.5.5 0 0 1-1 0V3.707L1.354 4.854a.5.5 0 1 1-.708-.708l2-1.999.007-.007a.498.498 0 0 1 .7.006l2 2a.5.5 0 1 1-.707.708L3.5 3.707V12.5zm3.5-9a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zM7.5 6a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zm0 3a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3zm0 3a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1h-1z"></path>
                </svg>
              </button>
                <button
                  type="button" id="config-button"
                  class="btn btn-priamry  btn-sm ${state.getSortConfiguration().open == 'Yes' ? 'orange' : '' }"
                  data-toggle="tooltip"
                  title="Open/close sort configuration"
                >
                  <svg xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    class="bi bi-gear"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"></path>
                    <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"></path>
                  </svg>
                </button>
            </div>
          </div>
          <div id="sort-config" class=" ${state.getSortConfiguration().open == 'Yes' ? 'd-flex' : 'd-none' } w-100 justify-content-end align-items-center ">
            <div class="btn-group mr-2  mt-2" role="group">
              <button type="button" id="conf_sort_asc" class="btn btn-secondary btn-xs ${state.getSortConfiguration().type == 'ASC' ? 'background_orange' : '' }">ASC</button>
              <button type="button" id="conf_sort_desc"  class="btn btn-secondary btn-xs ${state.getSortConfiguration().type == 'DESC' ? 'background_orange' : '' }">DESC</button>
            </div>
            <select id="select_config_key" class="form-select form-select-sm w-50 mt-2 mr-1 ">
              <option ${state.getSortConfiguration().key == 'NoSort' ? 'selected' : '' } value="NoSort">Default</option>
              <option ${state.getSortConfiguration().key == 'Parallel' ? 'selected' : '' } value="Parallel">Parallel</option>
              <option ${state.getSortConfiguration().key == 'Canonical' ? 'selected' : '' } value="Canonical">Canonical</option>
              <option ${state.getSortConfiguration().key == 'Perfect' ? 'selected' : '' } value="Perfect">Perfect</option>
              <option ${state.getSortConfiguration().key == 'Exit' ? 'selected' : '' } value="Exit">Exit</option>
              <option ${state.getSortConfiguration().key == 'IO' ? 'selected' : '' } value="IO">IO</option>
              <option ${state.getSortConfiguration().key == 'Readonly' ? 'selected' : '' } value="Readonly">Readonly</option>
              <option ${state.getSortConfiguration().key == 'UnsafeCFG' ? 'selected' : '' } value="UnsafeCFG">UnsafeCFG</option>
            </select>
          </div>
          <script>
            const sort_button = document.getElementById('sort-button')
            const conf_sort_button = document.getElementById('config-button')
            const sort_config = document.getElementById('sort-config')
            const conf_sort_asc = document.getElementById('conf_sort_asc')
            const conf_sort_desc = document.getElementById('conf_sort_desc')
            const select_config_key = document.getElementById('select_config_key')
            select_config_key.addEventListener('change', (e)=>{
              vscode.postMessage({ command: 'SetSortKey', key :  e.target.value, type : null});
            })
            conf_sort_asc.addEventListener('click', ()=>{
              vscode.postMessage({ command: 'SetSortTypeASC', key : null, type : 'ASC'});
              conf_sort_desc.classList.remove("background_orange")
              conf_sort_asc.classList.add("background_orange");
            })
            conf_sort_desc.addEventListener('click', ()=>{
              vscode.postMessage({ command: 'SetSortTypeDESC',  key : null, type : 'DESC'});
              conf_sort_asc.classList.remove("background_orange")
              conf_sort_desc.classList.add("background_orange");
            })
            sort_button.addEventListener('click', ()=>{
              vscode.postMessage({ command: 'Sort'});
            })
            conf_sort_button.addEventListener('click', ()=>{
              const status = conf_sort_button.classList.contains("orange")
              if (status){
                conf_sort_button.classList.remove("orange")
                conf_sort_button.classList.add("black");
                sort_config.classList.remove("d-flex")
                sort_config.classList.add("d-none")
                vscode.postMessage({ command: 'OpenSortConf', current : 'Yes'});
              } else {
                conf_sort_button.classList.remove("black")
                conf_sort_button.classList.add("orange");
                sort_config.classList.remove("d-none")
                sort_config.classList.add("d-flex")
                vscode.postMessage({ command: 'OpenSortConf', current : 'No'});
              }
            })
          </script>
        </div>
        <div class="col-1 d-flex justify-content-center">
          <div class="text-nowrap"> Parallel </div>
        </div>
        <div class="col-1  d-flex justify-content-center">
          <div class="text-nowrap">
            Canonical
          </div>
        </div>
        <div class="col-1  d-flex justify-content-center">
          <div class="text-nowrap">
            Perfect
          </div>
        </div>
        <div class="col-1  d-flex justify-content-center">
          <div class="text-nowrap">
            Exit
          </div>
        </div>
        <div class="col-1  d-flex justify-content-center">
          <div class="text-nowrap">
            IO
          </div>
        </div>
        <div class="col-1  d-flex justify-content-center">
          <div class="text-nowrap">
            Readonly
          </div>
        </div>
        <div class="col-1  d-flex justify-content-center">
          <div class="text-nowrap">
            Unsafe CFG
          </div>
        </div>
      </div>`;

    for (let func of funclst.Functions) {
      if (!func.User)
        continue;
      aliasTree.query['FuncID'] = func.ID;
      linkCallees.query['FuncID'] = func.ID;
      linkCallees.query['LoopID'] = 0;
      linkInOut.query['FuncID'] = func.ID;
      linkInOut.query['LoopID'] = 0;
      linkUnsafeCFG.query['FuncID'] = func.ID;
      linkUnsafeCFG.query['LoopID'] = 0;
      linkExit.query['FuncID'] = func.ID;
      linkExit.query['LoopID'] = 0;
      linkExit.body = func.Exit === null ? '?' : func.Exit.toString();
      body += `
      <div class="row py-2 text-center border-bottom table-row
           ${func.Traits.Parallel == 'Yes' ? 'table-row-success' : ''}">
        <div class="col-4 text-left border-right funtions_loops_names">
          <div class="funtions_loops_names_p1">
      `;
      if (func.Traits.Loops == "Yes")
        if (!func.Loops.length) {
          body += commandLink({
            command: 'tsar.loop.tree',
            project,
            title: log.FunctionList.loopTree.replace('{0}', log.FunctionList.build),
            body: '&plus;',
            query: JSON.stringify({ ID: func.ID })
          });
        } else {
          let isSubtreeHidden = state.isSubtreeHidden(func);
          body += `
          <a id="collapse-loopTree-${func.ID}"
              class = "source-link"
              title="${log.FunctionList.loopTree.replace('{0}',
                         isSubtreeHidden ? log.FunctionList.show
                                         : log.FunctionList.hide)}"
              data-toggle="collapse" href="#loopTree-${func.ID}" role="button"
              aria-expanded="${isSubtreeHidden ? 'false': 'true'}"
              aria-controls="loopTree-${func.ID}">
            ${isSubtreeHidden ? '&plus;' : '&minus;'}
          </a>`;
        }
      body += `
          <var>${func.Name}</var> at
          ${gotoExpansionLocLink(project, func.StartLocation)}
          &minus;${gotoExpansionLocLink(project, func.EndLocation)}
          ${func.Exit !== null ? commandLink(linkCallees) : ''}
          </div>
          <div class="funtions_loops_names_p1">
            ${PureFunction.template(`${func.ID}`)}
          </div>
        </div>
        <div class="col-1">${this._checkTrait(func.Traits.Parallel)}</div>
        <div class="col-1"></div>
        <div class="col-1"></div>
        <div class="col-1">${func.Exit !== null ? commandLink(linkExit) : '?'}</div>
        <div class="col-1">
          ${this._checkTrait(func.Traits.InOut, func.Exit !== null ? linkInOut : undefined)}
        </div>
        <div class="col-1">${this._checkTrait(func.Traits.Readonly)}</div>
        <div class="col-1">
          ${this._checkTrait(func.Traits.UnsafeCFG, func.Exit !== null ? linkUnsafeCFG : undefined)}
        </div>
      </div>`;
      if (func.Traits.Loops == "No" || !func.Loops.length)
        continue;
      body +=`
      <div class="collapse ${state.isSubtreeHidden(func) ? '' : 'show'}"
           id="loopTree-${func.ID}">`;
      body +=`
      <script>
        (function () {
          const loopTree = $('#loopTree-${func.ID}');
          const button = document.getElementById('collapse-loopTree-${func.ID}');
          loopTree.on('hidden.bs.collapse', function () {
            if ($(this).hasClass("show"))
              return;
            button.title = '${log.FunctionList.loopTree.replace('{0}', log.FunctionList.show)}';
            button.innerHTML = '&plus;';
            vscode.postMessage({ command: 'Subtree', hide: 'true', func: '${func.ID}'});
          });
          loopTree.on('shown.bs.collapse', function () {
            if (!$(this).hasClass("show"))
              return;
            button.title = '${log.FunctionList.loopTree.replace('{0}', log.FunctionList.hide)}';
            button.innerHTML = '&minus;';
            vscode.postMessage({ command: 'Subtree', hide: 'false', func: '${func.ID}'});
          });
        }())
      </script>`;
      let currentLevel = 1;
      for (let idx = 0; idx < func.Loops.length; ++idx) {
        let loop = func.Loops[idx];
        aliasTree.query['LoopID'] = loop.ID;
        linkCallees.query['LoopID'] = loop.ID;
        linkInOut.query['LoopID'] = loop.ID;
        linkUnsafeCFG.query['LoopID'] = loop.ID;
        linkExit.query['LoopID'] = loop.ID;
        linkExit.body = loop.Exit === null ? '?' : loop.Exit.toString();
        if (loop.Level > currentLevel) {
          let parentLoop = func.Loops[idx - 1];
          body += `
          <div class="collapse ${state.isSubtreeHidden(parentLoop) ? '' : 'show'}"
               id="loopTree-${func.ID}-${parentLoop.ID}">`;
          body += `
          <script>
            (function () {
              const loopTree = $('#loopTree-${func.ID}-${parentLoop.ID}');
              const button = document.getElementById(
                'collapse-loopTree-${func.ID}-${parentLoop.ID}');
              loopTree.on('hidden.bs.collapse', function () {
                if ($(this).hasClass("show"))
                  return;
                button.title = '${log.FunctionList.loopTree.replace('{0}', log.FunctionList.show)}';
                button.innerHTML = '&plus;';
                vscode.postMessage({
                  command: 'Subtree',
                  hide: 'true',
                  func: '${func.ID}',
                  loop: '${parentLoop.ID}'
                });
              });
              loopTree.on('shown.bs.collapse', function () {
                if (!$(this).hasClass("show"))
                  return;
                button.title = '${log.FunctionList.loopTree.replace('{0}', log.FunctionList.hide)}';
                button.innerHTML = '&minus;';
                vscode.postMessage({
                  command: 'Subtree',
                  hide: 'false',
                  func: '${func.ID}',
                  loop: '${parentLoop.ID}'
                });
              });
            }())
          </script>`;
          ++currentLevel;
        } else if (loop.Level < currentLevel) {
          body += '</div>'.repeat(currentLevel - loop.Level);
          currentLevel = loop.Level;
        }
        body += `
        <div class="row py-2 text-center border-bottom table-row
                    ${loop.Traits.Parallel == 'Yes' ? 'table-row-success' : ''}">
          <div class="col-4  d-flex  justify-content-start align-items-center border-right">
            ${'&emsp;'.repeat(loop.Level)}`;
        if (idx < func.Loops.length - 1 && func.Loops[idx + 1].Level > loop.Level) {
          let isSubtreeHidden = state.isSubtreeHidden(loop);
          body += `
            <a id="collapse-loopTree-${func.ID}-${loop.ID}"
               class="source-link"
               title="${log.FunctionList.loopTree.replace('{0}',
                          isSubtreeHidden ? log.FunctionList.show
                                          : log.FunctionList.hide)}"
               data-toggle="collapse" href="#loopTree-${func.ID}-${loop.ID}" role="button"
               aria-expanded="${isSubtreeHidden ? 'false': 'true'}"
               aria-controls="loopTree-${func.ID}-${loop.ID}">
              ${isSubtreeHidden ? '&plus;' : '&minus;'}
            </a>`;
        } else {
          body += '&emsp;'
        }
        body += `
            <var class="mr-1">${loop.Type.toLowerCase()}</var> loop in <var class="mr-1 ml-1">${func.Name}</var> at
              <span class="mr-1 ml-1"> ${gotoExpansionLocLink(project, loop.StartLocation)}</span>
              &minus;<span class="ml-1 mr-1">${gotoExpansionLocLink(project, loop.EndLocation)}</span>
            ${loop.Exit !== null ? commandLink(linkCallees) : ''}
            ${loop.Exit !== null ? commandLink(aliasTree) : ''}
          </div>
          <div class="col-1 ">
            ${this._checkTrait(loop.Traits.Parallel)}
          </div>
          <div class="col-1">${this._checkTrait(loop.Traits.Canonical)}</div>
          <div class="col-1">${this._checkTrait(loop.Traits.Perfect)}</div>
          <div class="col-1">${loop.Exit !== null ? commandLink(linkExit) : ''}</div>
          <div class="col-1">
            ${this._checkTrait(loop.Traits.InOut,
               loop.Exit !== null ? linkInOut : undefined)}
           </div>
          <div class="col-1"></div>
          <div class="col-1">
            ${this._checkTrait(loop.Traits.UnsafeCFG,
               loop.Exit !== null ? linkUnsafeCFG : undefined)}
          </div>
        </div>`;
      }
      body += '</div>'.repeat(currentLevel - 1);
      body += `</div>`;
    }
    body += PureFunction.style();
    body += PureFunction.script();
    body += StoreToJSON.style();
    body += StoreToJSON.script();
    body += `</body></html>`;
    return body;
  }

  private _registerListeners(project: Project, state: LoopTreeProviderState, funclst: msg.FunctionList) {
    let panel = state.panel;
    project.component_store.save(['global', 'function_list'], funclst.Functions)
    panel.webview.onDidReceiveMessage(message => {
      switch(message.command) {
        case 'Subtree':
          let f = funclst.Functions.find(f => { return f.ID == message.func});
          if (!('loop' in message))
            state.setSubtreeHidden(message.hide === 'false', f);
          else
            state.setSubtreeHidden(message.hide === 'false',
              f, f.Loops.find(l => { return l.ID == message.loop}));
          break;
        case 'Sort':
          const dt = (state.data as Data)
          state.sortFunction(dt.Configuration.sort_key, dt.Configuration.sort_type)
          this.update(project)
          break;
        case 'OpenSortConf':
          state.openSortConf(message.current)
          break;
        case 'SetSortKey':
          state.setSortParam(message.key, message.type)
          break;
        case 'SetSortTypeASC':
          state.setSortParam(message.key, message.type)
          break;
        case 'SetSortTypeDESC':
          state.setSortParam(message.key, message.type)
          break;
        default:
          project.component_store.script_save_into_global_store(message.command, message.path, message.data)
          break;
      }
    }, null, state.disposables);
    panel.onDidChangeViewState(e => {
      const panel = e.webviewPanel;
      if (!panel.visible)
        return;
      panel.webview.postMessage(project.component_store.script_restore_message())
      panel.webview.postMessage({
        command: 'Sort',
        open: (state.data as Data).Configuration.sort_conf,
        type: (state.data as Data).Configuration.sort_type,
        key: (state.data as Data).Configuration.sort_key,
      });
      for (let [key,value] of (state.data as Data).Info) {
        if (isFunction(key))
          panel.webview.postMessage({
            command: 'Subtree',
            func: key.ID,
            hide: `${!value.ShowSubtree}`
          });
        else
          panel.webview.postMessage({
            command: 'Subtree',
            func: value.Function.ID,
            loop: key.ID,
            hide: `${!value.ShowSubtree}`
          });
      }
    }, null, state.disposables);
  }

  private _checkTrait(trait: string, commandJSON:any = undefined): string {
    if (trait === "Yes") {
      if (commandJSON !== undefined) {
        commandJSON.body = `&#10003`;
        return commandLink(commandJSON);
      }
      return `&#10003;`;
    }
    return `&minus;`;
  }
}
