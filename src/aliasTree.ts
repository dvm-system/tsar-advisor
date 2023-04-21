
'use strict';

import * as vscode from 'vscode';
import { headHtml, UpdateUriFunc, DisposableLikeList } from './functions';
import { gotoExpansionLocLink } from './fileList';
import * as log from './log';
import * as msg from './messages';
import {Project, ProjectEngine} from './project';
import {ProjectWebviewProviderState,
  ProjectWebviewProvider} from './webviewProvider';
import * as Checkbox from './components/Checkbox'
import * as Select from './components/Select'
import * as Input from './components/Input'

export function registerCommands(engine: ProjectEngine, subscriptions: DisposableLikeList) {
  let showAliasTree = vscode.commands.registerCommand('tsar.loop.alias',
    (uri:vscode.Uri) => {
      let project = engine.project(uri);
      let state = project.providerState(AliasTreeProvider.scheme);
      state.active = true;
      project.focus = state;
      let request = new msg.AliasTree;
      let query = JSON.parse(uri.query);
      request.FuncID = query.FuncID;
      request.LoopID = query.LoopID;
      if (!state.actual(request))
        project.send(request);
    });
  subscriptions.push(showAliasTree);
}

interface Data {
  Functions: Map<number, msg.Function>;
  AliasTree: msg.AliasTree;
}

class AliasTreeProviderState extends ProjectWebviewProviderState<AliasTreeProvider> {
  actual(request: any): boolean {
    if (request instanceof msg.FunctionList)
      return this.data !== undefined &&
             this.data.Functions !== undefined;
    return false;
  }

  onResponse(response: any, project: Project): Thenable<Data|undefined> {
    return new Promise(resolve => {
      if (response === undefined) {
        if (this.data !== undefined &&
            (this.data as Data).AliasTree !== undefined &&
            (this.data as Data).Functions !== undefined)
          return resolve(this.data);
        return resolve(undefined);
      }
      // Remember list of functions for further usage.
      if (response instanceof msg.FunctionList) {
        // We receive a new list of functions, so dropout a constructed alias tree
        // because it may be out of data.
        this.active = false;
        let functions = new Map<number, msg.Function>();
        for (let f of response.Functions)
          functions.set(f.ID, f);
        let data:Data = {
          Functions: functions,
          AliasTree: undefined
        };
        this._data = data;
        return resolve(undefined);
      }
      if (response instanceof msg.AliasTree) {
        // We should build alias tree however there is no information about
        // functions. So, let us send corresponding requests to the server.
        if (this._data === undefined ||
            (this._data as Data).Functions === undefined) {
          vscode.commands.executeCommand('tsar.function.list', project.uri);
          vscode.commands.executeCommand('tsar.loop.tree',
            project.uri.with({query: JSON.stringify({ID: response.FuncID})}));
          // It is also necessary to repeat current request to remember list of callees.
          let request = new msg.AliasTree();
          request.FuncID == response.FuncID;
          request.LoopID = response.LoopID;
          project.send(request);
          return resolve(undefined);
        }
        (this.data as Data).AliasTree = response
        return resolve(this.data);
      }
      if (this.data !== undefined &&
          (this.data as Data).AliasTree !== undefined &&
          (this.data as Data).Functions !== undefined)
        return resolve(this.data);
      return resolve(undefined);
    });
  }
}




export class AliasTreeProvider extends ProjectWebviewProvider {
  static scheme = "tsar-aliastree";

  public scheme(): string { return AliasTreeProvider.scheme; }

  public state(): AliasTreeProviderState {
    return new AliasTreeProviderState(this);
  }

  protected _title(): string { return log.AliasTree.title; }

  protected _needToHandle(response: any): boolean {
    return response instanceof msg.AliasTree ||
      response instanceof msg.FunctionList;
  }

  private _registerListeners(project: Project, state:AliasTreeProviderState) {
    let panel = state.panel;
    panel.webview.onDidReceiveMessage(message => {
      switch(message.command) {
        default:
          project.component_store.script_save_into_global_store(message.command, message.path, message.data)
          break;
      }
    }, null, state.disposables);
    panel.onDidChangeViewState(e => {
      panel.webview.postMessage(project.component_store.script_restore_message())
    }, null, state.disposables);
  }


  private _memoryInfo(project: Project, memory: msg.MemoryLocation [], separateTraits: {}) : [string, string[][]] {
    if (!memory)
     return ['', []];
    let label:string = '';
    let objs = new Map<number, string []>();
    for (let m of memory) {
      let info = `${m.Address}, ${m.Size > 0 ? m.Size : '?'}B`;
      label += info + '\\n';
      let id = m.Object && m.Object.ID !== undefined ? m.Object.ID : 0;
      if (m.Locations && m.Locations.length > 0) {
        let ls = [];
        for (let loc of m.Locations)
          ls.push(gotoExpansionLocLink(project, loc));
        info += ' at ' + ls.join(', ');
      }
      let obj = objs.get(id);
      if (obj === undefined) {
        let decl = '';
        if (m.Object) {
          if (m.Object.Name)
            decl += `<var>${m.Object.Name}</var> `;
          if (m.Object.DeclLocation &&
              (m.Object.DeclLocation.Line !== 0 ||
                m.Object.DeclLocation.Column !== 0))
            decl += `at ${gotoExpansionLocLink(project, m.Object.DeclLocation)}`;
        }
        if (decl.length === 0)
          decl = '<var>no name</var>';
        objs.set(id, [decl, info]);
      } else {
        obj.push(info);
      }
      for (let t in m.Traits) {
        let dptr = m.Traits[t];
        let traitInfo = info;
        if (t == 'reduction') {
          traitInfo += ` (${dptr.Kind})`;
        } else if (t == 'induction') {
          traitInfo += ' (' + dptr.Kind;
          if (dptr.Start || dptr.End || dptr.Step) {
            traitInfo += ', ';
            if (dptr.Start)
              traitInfo += dptr.Start;
            traitInfo += ':';
            if (dptr.End)
              traitInfo += dptr.End;
            traitInfo += ':';
            if (dptr.Step)
              traitInfo += dptr.Step;
          }
          traitInfo += ')';
        } else if (t == 'anti' || t == 'flow' || t == 'output') {
          traitInfo += ' (';
          if (dptr.May)
            traitInfo += 'may';
          else
            traitInfo += 'must';
          if (dptr.Causes && dptr.Causes.length > 0)
            traitInfo += ', ' + dptr.Causes.join(', ');
          if (dptr.Min || dptr.Max) {
            traitInfo += ", ";
            if (dptr.Min)
              traitInfo += dptr.Min;
            traitInfo += ':';
            if (dptr.Max)
              traitInfo += dptr.Max;
          }
          traitInfo += ')';
        }
        let v = separateTraits[t];
        if (v === undefined)
          separateTraits[t] = {"separate": true, "union": false, "objects": [traitInfo]};
        else
          v.objects.push(traitInfo);
      }
    }
    let description: string [][] = [];
    for (let ms of objs.values())
      description.push(ms);
    return [label, description];
  }

  protected _provideContent(project: Project, data: Data,
      asWebviewUri: UpdateUriFunc): string {

    let state = project.providerState(
      AliasTreeProvider.scheme) as AliasTreeProviderState;

    this._registerListeners(project, state);

    let nodes = '';
    let edges = '';
    project.component_store.save(['global', 'vars'],data.AliasTree.Nodes)
    for (let n of data.AliasTree.Nodes) {
      let traits: any = {};
      let [selfLabel, selfDescription] = this._memoryInfo(project, n.SelfMemory, traits);
      let [coveredLabel, coveredDescription] = this._memoryInfo(project, n.CoveredMemory, traits);
      for (let t of n.Traits) {
        let tInfo = traits[t];
        if (tInfo === undefined) {
          traits[t] = { "separate": false, "union": true };
        } else {
          tInfo.union = true;
        }
      }
      for (let t in traits) {
        let obj = traits[t]['objects'];
        if (obj)
          obj.sort();
      }
      nodes += `{
        id: ${n.ID},
        traits: ${JSON.stringify(traits)},
        self: ${JSON.stringify(selfDescription)},
        covered: ${JSON.stringify(coveredDescription)},
        kind: '${n.Kind}'`;
      if (n.Kind === 'Top')
        nodes += ', shape: "database"';
      else if (n.Kind === 'Unknown')
        nodes += `, shape: 'circle'`
      else
        nodes +=`, label: '${selfLabel + coveredLabel}'`;
      let background = "floralwhite";
      if (n.Kind !== 'Top') {
        for (let t in traits) {
          if (t == 'anti' || t == 'flow' || t == 'output' || t == 'address access') {
            background = 'lightcoral';
            break;
          }
          if (traits[t].union &&
              (t == 'shared' || t == 'read only' || t == 'private')) {
            background = 'lightgreen';
            break;
          }
        }
      }
      if (n.Coverage)
        nodes += `,color: { border: "darkorange", background: "${background}"}`;
      else
        nodes += `,color: { background: "${background}"}`;
      nodes += '},'
    }
    for (let e of data.AliasTree.Edges) {
      edges += `{from: ${e.From}, to: ${e.To}`;
      if (e.Kind === 'Unknown')
        edges += ', dashes: true';
      edges += '},';
    }
    // Remove last comma.
    nodes = nodes.substr(0, nodes.length - 1);
    edges = edges.substr(0, edges.length - 1);
    let targetFunc = data.Functions.get(data.AliasTree.FuncID);
    let targetObj:msg.Function|msg.Loop = targetFunc;
    let gotoTarget = '';
    if (data.AliasTree.LoopID) {
      targetObj = targetFunc.Loops.find(l=> { return l.ID == data.AliasTree.LoopID});
      gotoTarget = `loop at ${gotoExpansionLocLink(project, targetObj.StartLocation)} in `;
    }
    gotoTarget += `<var>${targetFunc.Name}</var> declared at ` +
      gotoExpansionLocLink(project, targetFunc.StartLocation);

    const html =`
      <!doctype html>
      <html lang="en">
        ${headHtml(asWebviewUri, {bootstrap: true, visNetwork: true})}
        <body class="bg-white">
          <script>
            const vscode = acquireVsCodeApi();
            window.addEventListener('message', event => {
              const message = event.data;
              switch (message.command) {
                ${
                  project.component_store.script_load_from_store([
                    Checkbox.className(),
                    Select.className(),
                    Input.className(),
                  ])
                }
              }
            });
          </script>
          <div class="container-fluid" style="height : 100%; width : 100%; min-width : 1050px; min-height : 400px">
            <div class="row" style="height : 100%;">
              <div class="col-8 pt-2 pb-3 d-flex flex-column" style="height : 100%;">
                <div>
                  <h4>${this._title().replace('{0}', gotoTarget)}</h4>
                </div>
                <div id="aliasTree" class="flex-fill bg-white" style="height:calc(100% - 36px); width : 100%; overflow-y : hidden; overflow-x : hidden; border : 1px solid lightgrey;"></div>
              </div>
              <div class="col-4" class="bg-white" style="min-width: 350px">
                <div class="accordion mt-3 mb-3" style="border: 1px solid lightgrey; height: 100%;">
                  <div id="memoryInfoContainer" style="height: calc(100% - 80px); border-bottom: 1px solid lightgrey; min-height: 133px">
                    <div
                      id="memoryInfoHeader"
                      style="height: 40px;padding: 0.375rem 0.75rem; border-bottom: 1px solid lightgrey; color:black; background-color:rgba(0,0,0,0.03); font-size: 2.5rem; display:flex; flex-direction: column; justify-content: center; "
                    >
                    </div>
                    <div style="overflow-y: scroll;height: calc(100% - 40px)" id="memoryInfo">
                    <div style="height: 100%; width: 100%; display: flex; justify-content: center; align-items: center;"><h5 style="font-weight: 500!important;margin-bottom: 0; color: lightgrey">Please, select node</h5></div>
                    </div>
                  </div>
                  <div id="traitInfoContainer" style="height: 40px; min-height: 40px; border-bottom: 1px solid lightgrey;">
                    <div
                      id="traitInfoHeader"
                      style="height: 40px;padding: 0.375rem 0.75rem; border-bottom: 1px solid lightgrey; color:black; background-color:rgba(0,0,0,0.03); font-size: 2.5rem; display:flex; flex-direction: column; justify-content: center; "
                    ></div>
                    <div style="overflow-y: scroll;height: calc(100% - 40px)" id="traitInfo"></div>
                  </div>
                  <div id="confInfoContainer"  style="height: 40px; min-height: 40px; border-bottom: 1px solid lightgrey;">
                  <div
                    id="confInfoHeader"
                    style="height: 40px;padding: 0.375rem 0.75rem; border-bottom: 1px solid lightgrey; color:black; background-color:rgba(0,0,0,0.03); font-size: 2.5rem; display:flex; flex-direction: column; justify-content: center; "
                  ></div>
                  <div style="overflow-y: scroll; height: calc(100% - 40px)" id="confInfo"></div>
                </div>
              </div>
            </div>
          </div>
          <script type="text/javascript">
            var nodes = new vis.DataSet([${nodes}]);
            var edges = new vis.DataSet([${edges}]);
            var container = document.getElementById('aliasTree');
            var data = {
              nodes: nodes,
              edges: edges
            };
            var options = {
              layout: {
                hierarchical: {
                  direction: 'UD',
                  sortMethod: 'directed',
                  shakeTowards: 'roots'
                }
              },
              physics: {
                hierarchicalRepulsion: {
                  avoidOverlap: 1
                }
              },
              nodes: {
                shape: "box",
                color: {
                  border: "grey"
                }
              },
              edges: {
                arrows: {
                  to: {
                    enabled: true,
                    type: "arrow"
                  }
                }
              }
            };
            var network = new vis.Network(container, data, options);
            network.on('click', selected => {
              const memoryInfo = document.getElementById('memoryInfo');
              const memoryInfoHeader = document.getElementById('memoryInfoHeader');
              const memoryInfoContainer =  document.getElementById('memoryInfoContainer');
              const traitInfo = document.getElementById('traitInfo');
              const traitInfoHeader = document.getElementById('traitInfoHeader');
              const traitInfoContainer =  document.getElementById('traitInfoContainer');
              const confInfo = document.getElementById('confInfo');
              const confInfoHeader = document.getElementById('confInfoHeader');
              const confInfoContainer =  document.getElementById('confInfoContainer');
              memoryInfo.innerHTML = '';
              traitInfo.innerHTML = '';
              traitInfoHeader.innerHTML = '';
              confInfoHeader.innerHTML = '';
              confInfoContainer.style.height = '40px'
              confInfoContainer.style.minHeight  = '40px'
              confInfoContainer.style.minWidth  = '310px'
              traitInfoContainer.style.height = '40px'
              confInfoContainer.style.minHeight  = '40px'
              memoryInfoContainer.style.height = 'calc(100% - 80px)'
              if (!selected.nodes || selected.nodes.length != 1){
                memoryInfoHeader.innerHTML = ''
                traitInfoHeader.innerHTML = '';
                confInfoHeader.innerHTML = '';
                confInfoContainer.style.height = '40px'
                confInfoContainer.style.minHeight  = '40px'
                traitInfoContainer.style.height = '40px'
                confInfoContainer.style.minHeight  = '40px'
                confInfoContainer.style.minWidth  = '310px'
                memoryInfoContainer.style.height = 'calc(100% - 80px)'
                const html = '<div style="height: 100%; width: 100%; display: flex; justify-content: center; align-items: center;"><h5 style="font-weight: 500!important;margin-bottom: 0; color: lightgrey">Please, select node</h5></div>'
                memoryInfo.innerHTML = html
                return;
              }
              let n = nodes.get(selected.nodes[0]);
              if (n.self && n.self.length > 0) {
                let html =
                  '<div class="mt-2 ml-2">';
                html += '<ul class="list-unstyled">';
                for (let idx in n.self) {
                  html += '<li>';
                  html += '<a data-toggle="collapse" href="#selflist-' + idx + '"' +
                    'role="button" aria-expanded="false" aria-controls="selflist-' + idx + '">' +
                    '&#10065;</a>&nbsp;' + n.self[idx][0];
                  html += '<div class="collapse" id="selflist-' + idx + '">';
                  html += '<ul class="list-unstyled pl-3">';
                  for (let i = 1; i < n.self[idx].length; ++i)
                    html += '<li>' + n.self[idx][i] + '</li>';
                  html += '</ul>';
                  html += '</div>'
                  html += '</li>';
                }
                html += '</ul></div>';
                memoryInfo.innerHTML = html;
                memoryInfoHeader.innerHTML = '<h6 style="font-weight: 700!important;margin-bottom: 0;">${log.AliasTree.nodeSelf}</h6>'
                confInfoContainer.style.height = '40px'
                confInfoContainer.style.minHeight  = '40px'
                traitInfoContainer.style.height = '50%'
                confInfoContainer.style.minHeight  = '133px'
                confInfoContainer.style.minWidth  = '310px'
                memoryInfoContainer.style.height = 'calc(50% - 40px)'
              }
              if (n.covered && n.covered.length > 0) {
                let html = '';
                if (n.kind === 'Top')
                  memoryInfoHeader.innerHTML = '<h6 style="font-weight: 700!important;margin-bottom: 0;">${log.AliasTree.nodeCovered}</h6>'
                else
                  memoryInfoHeader.innerHTML = '<h6 style="font-weight: 700!important;margin-bottom: 0;">${log.AliasTree.nodeOverlap}</h6>'
                html += '<div class="mt-2 ml-2">';
                html += '<ul class="list-unstyled">';
                for (let idx in n.covered) {
                  html += '<li>';
                  html += '<a data-toggle="collapse" href="#coveredlist-' + idx + '"' +
                    'role="button" aria-expanded="false" aria-controls="coveredlist-' + idx + '">' +
                    '&#10065;</a>&nbsp;' + n.covered[idx][0];
                  html += '<div class="collapse" id="coveredlist-' + idx + '">';
                  html += '<ul class="list-unstyled pl-2">';
                  for (let i = 1; i < n.covered[idx].length; ++i)
                    html += '<li>' + n.covered[idx][i] + '</li>';
                  html += '</ul>';
                  html += '</div>'
                  html += '</li>';
                }
                html += '</ul></div>';
                memoryInfo.innerHTML += html;
              }
              if (n.kind !== 'Top' && n.traits) {
                let html = '';
                html += '<div class="mt-2 ml-2" style="overflow: scroll">';
                html += '<ul class="list-unstyled">';
                let empty = true;
                for (let t in n.traits) {
                  empty = false;
                  html += '<li>';
                  if (n.traits[t].union)
                    html += '<span style="cursor:pointer" title="${log.AliasTree.hasCombined}">&#9741;</span>';
                  else
                    html += '<span style="visibility: hidden">&#9741;</span>';
                  if (n.traits[t].separate) {
                    html += '<a title="${log.AliasTree.hasSeparate}" data-toggle="collapse"' +
                      'href="#separateTraitList-' + t.replace(/\\s/g, '-') + '"' +
                      'role="button" aria-expanded="false"' +
                      'aria-controls="separateTraitList-' + t.replace(/\\s/g, '-') + '">' +
                    '&#9737;</a>';
                  } else {
                    html += '<span style="visibility: hidden">&#9737;</span>';
                  }
                  html += '&nbsp;' + t;
                  if (n.traits[t].separate) {
                    html += '<div class="ml-4 collapse" id="separateTraitList-' + t.replace(/\\s/g, '-') + '">';
                    html += '<ul class="list-unstyled">';
                    for (let m of n.traits[t].objects) {
                      html += '<li>' + m + '</li>';
                    }
                    html += '</ul>';
                    html += '</div>';
                  }
                  html += '</li>';
                }
                html += '</ul></div>';
                let html_for_users_options = ''
                const option_names = ['WriteOccured','ReadOccured','Private','UseAfterLoop','DefBeforeLoop','Reduction','Induction','Flow','Anti','Output']
                const option_describe = [
                  'The presence of write operations a variable in a loop;',
                  'The presence of read operations from a variable in a loop;',
                  "Indicates the fact that a value was written to a variable at the iteration of the loop before reading the value of the same variable at the same iteration of the loop;",
                  "Indicates whether the variable is used for reading after exiting the loop;",
                  "Indicates whether the variable is used for reading in the loop before assigning some value to it at the iteration of this loop;",
                  "indicates the presence of a reduction operation on the given variable in the loop;",
                  "Indicates that the variable is an inductive loop variable; Fr<From> - start index, To<To> - final index; St<Step> - index step",
                  "Indicates the presence of a flow-dependence in the loop for this variable, requires an indication of the distance of the dependence;",
                  "Indicates the presence of a anti-dependence in the loop for this variable, requires an indication of the distance of the dependence;",
                  "Indicates the presence of a output-dependence in the loop for this variable, requires an indication of the distance of the dependence;",
                ]
                const option_component = [
                  '${Checkbox.template_flat({
                    id:'alias_tree_checkbox_write_ocured',
                    path:['json_generator', 'alias_tree', 'write_occured'],
                    data:{loop_id : data.AliasTree.LoopID}
                  })}',
                  '${Checkbox.template_flat({
                    id:'alias_tree_checkbox_read_ocured',
                    path:['json_generator', 'alias_tree', 'read_occured'],
                    data:{loop_id : data.AliasTree.LoopID}
                  })}',
                  '${Checkbox.template_flat({
                    id:'alias_tree_checkbox_private',
                    path:['json_generator', 'alias_tree', 'private'],
                    data:{loop_id : data.AliasTree.LoopID}
                  })}',
                  '${Checkbox.template_flat({
                    id:'alias_tree_checkbox_use_after_loop',
                    path:['json_generator', 'alias_tree', 'use_after_loop'],
                    data:{loop_id : data.AliasTree.LoopID}
                  })}',
                  '${Checkbox.template_flat({
                    id:'alias_tree_checkbox_def_before_loop',
                    path:['json_generator', 'alias_tree', 'def_before_loop'],
                    data:{loop_id : data.AliasTree.LoopID}
                  })}',
                  '<div style="display: flex; align-items:center; height:100%; flex-direction: row;">${Select.template_flat({
                    id:'alias_tree_select_reduction',
                    path:['json_generator', 'alias_tree', 'reduction'],
                    values:['Add','Mult', 'Or', 'Add', 'Xor', 'Max', 'Min'],
                    data:{loop_id : data.AliasTree.LoopID}
                  })}${Checkbox.template_flat({
                    id:'alias_tree_checkbox_reduction',
                    path:['json_generator', 'alias_tree', 'reduction'],
                    data:{loop_id : data.AliasTree.LoopID}
                  })}</div>',
                  '<div style="display: flex; align-items:center; height:100%; flex-direction: row;">${Input.template_flat({
                    id:'alias_tree_input_induction_from',
                    path:['json_generator', 'alias_tree', 'induction'],
                    placeholder: 'Fr',
                    type: 'text',
                    style: {'width' : '47px', 'margin-right' : '10px'},
                    data:{loop_id : data.AliasTree.LoopID}
                  })}${Input.template_flat({
                    id:'alias_tree_input_induction_to',
                    path:['json_generator', 'alias_tree', 'induction'],
                    placeholder: 'To',
                    type: 'text',
                    style: {'width' : '47px', 'margin-right' : '10px'},
                    data:{loop_id : data.AliasTree.LoopID}
                  })}${Input.template_flat({
                    id:'alias_tree_input_induction_step',
                    path:['json_generator', 'alias_tree', 'induction'],
                    placeholder: 'St',
                    type: 'text',
                    style: {'width' : '47px', 'margin-right' : '10px'},
                    data:{loop_id : data.AliasTree.LoopID}
                  })}${Checkbox.template_flat({
                    id:'alias_tree_checkbox_induction',
                    path:['json_generator', 'alias_tree', 'induction'],
                    data:{loop_id : data.AliasTree.LoopID}
                  })}</div>',
                  '<div style="display: flex; align-items:center; height:100%; flex-direction: row;">${Input.template_flat({
                    id:'alias_tree_input_flow_max',
                    path:['json_generator', 'alias_tree', 'flow'],
                    placeholder: 'Max',
                    type: 'text',
                    style: {'width' : '70px', 'margin-right' : '10px'},
                    data:{loop_id : data.AliasTree.LoopID}
                  })}${Input.template_flat({
                    id:'alias_tree_input_flow_min',
                    path:['json_generator', 'alias_tree', 'flow'],
                    placeholder: 'Min',
                    type: 'text',
                    style: {'width' : '70px', 'margin-right' : '10px'},
                    data:{loop_id : data.AliasTree.LoopID}
                  })}${Checkbox.template_flat({
                    id:'alias_tree_checkbox_flow',
                    path:['json_generator', 'alias_tree', 'flow'],
                    data:{loop_id : data.AliasTree.LoopID}
                  })}</div>',
                  '<div style="display: flex; align-items:center; height:100%; flex-direction: row;">${Input.template_flat({
                    id:'alias_tree_input_anti_max',
                    path:['json_generator', 'alias_tree', 'anti'],
                    placeholder: 'Max',
                    type: 'text',
                    style: {'width' : '70px', 'margin-right' : '10px'},
                    data:{loop_id : data.AliasTree.LoopID}
                  })}${Input.template_flat({
                    id:'alias_tree_input_anti_min',
                    path:['json_generator', 'alias_tree', 'anti'],
                    placeholder: 'Min',
                    type: 'text',
                    style: {'width' : '70px', 'margin-right' : '10px'},
                    data:{loop_id : data.AliasTree.LoopID}
                  })}${Checkbox.template_flat({
                    id:'alias_tree_checkbox_anti',
                    path:['json_generator', 'alias_tree', 'anti'],
                    data:{loop_id : data.AliasTree.LoopID}
                  })}</div>',
                  '<div style="display: flex; align-items:center; height:100%; flex-direction: row;">${Input.template_flat({
                    id:'alias_tree_input_output_max',
                    path:['json_generator', 'alias_tree', 'output'],
                    placeholder: 'Max',
                    type: 'text',
                    style: {'width' : '70px', 'margin-right' : '10px'},
                    data:{loop_id : data.AliasTree.LoopID}
                  })}${Input.template_flat({
                    id:'alias_tree_input_output_min',
                    path:['json_generator', 'alias_tree', 'output'],
                    placeholder: 'Min',
                    type: 'text',
                    style: {'width' : '70px', 'margin-right' : '10px'},
                    data:{loop_id : data.AliasTree.LoopID}
                  })}${Checkbox.template_flat({
                    id:'alias_tree_checkbox_output',
                    path:['json_generator', 'alias_tree', 'output'],
                    data:{loop_id : data.AliasTree.LoopID}
                  })}</div>'
                ]
                html_for_users_options += '<ul class="list-group">'
                for (let i = 0; i < option_names.length; i++){
                  html_for_users_options +=   '<li class="list-group-item" style="padding: 0rem 0rem;">'
                  html_for_users_options +=     '<div style="width: 100%; height: 45px; align-items:center;  display:flex; flex-direction: row; justify-content: start;">'
                  html_for_users_options +=       '<div style="width: 30px; text-align: center; font-size: 18px;">'
                  html_for_users_options +=         '<span style="cursor:pointer" title="' + (option_describe[i] || "") + '">&#9741</span>';
                  html_for_users_options +=       '</div>'
                  html_for_users_options +=       '<div>'
                  html_for_users_options +=         option_names[i]  || 'Name'
                  html_for_users_options +=       '</div>'
                  html_for_users_options +=       '<div style="display: flex; align-items:center; height:100%; flex-direction: row;justify-content: end; padding-right: 10px;flex-grow: 1;">'
                  html_for_users_options +=         option_component[i]  || 'Component'
                  html_for_users_options +=       '</div>'
                  html_for_users_options +=     '</div>'
                  html_for_users_options +=   '</li>'
                }
                html_for_users_options += '</ul>'

                  traitInfo.innerHTML = html;
                  confInfo.innerHTML = html_for_users_options
                  traitInfoHeader.innerHTML = '<h6 style="font-weight: 700!important;margin-bottom: 0;">${log.AliasTree.traisList}</h6>';
                  confInfoHeader.innerHTML = '<h6 style="font-weight: 700!important;margin-bottom: 0;">Users Options</h6>';
                  confInfoContainer.style.height = '30%'
                  confInfoContainer.style.minHeight  = '133px'
                  traitInfoContainer.style.height = '40%'
                  confInfoContainer.style.minHeight  = '133px'
                  confInfoContainer.style.minWidth  = '310px'
                  memoryInfoContainer.style.height = '30%'

                  ${Checkbox.render(null, 'n.id')}
                  ${Select.render(null, 'n.id')}
                  ${Input.render(null, 'n.id')}
                  document.getElementById('alias_tree_checkbox_reduction').addEventListener('click', (e)=>{
                    e.stopPropagation()
                    const s = ${Checkbox.template_api.get('alias_tree_checkbox_reduction')}
                    if (s){
                      ${Select.template_api.enable('alias_tree_select_reduction')}
                    } else {
                      ${Select.template_api.disable('alias_tree_select_reduction')}
                    }
                  })
                  document.getElementById('alias_tree_checkbox_flow').addEventListener('click', (e)=>{
                    e.stopPropagation()
                    const s = ${Checkbox.template_api.get('alias_tree_checkbox_flow')}
                    if (s){
                      ${Input.template_api.enable('alias_tree_input_flow_max')}
                      ${Input.template_api.enable('alias_tree_input_flow_min')}
                    } else {
                      ${Input.template_api.disable('alias_tree_input_flow_max')}
                      ${Input.template_api.disable('alias_tree_input_flow_min')}
                    }
                  })
                  document.getElementById('alias_tree_checkbox_anti').addEventListener('click', (e)=>{
                    e.stopPropagation()
                    const s = ${Checkbox.template_api.get('alias_tree_checkbox_anti')}
                    if (s){
                      ${Input.template_api.enable('alias_tree_input_anti_max')}
                      ${Input.template_api.enable('alias_tree_input_anti_min')}
                    } else {
                      ${Input.template_api.disable('alias_tree_input_anti_max')}
                      ${Input.template_api.disable('alias_tree_input_anti_min')}
                    }
                  })
                  document.getElementById('alias_tree_checkbox_output').addEventListener('click', (e)=>{
                    e.stopPropagation()
                    const s = ${Checkbox.template_api.get('alias_tree_checkbox_output')}
                    if (s){
                      ${Input.template_api.enable('alias_tree_input_output_max')}
                      ${Input.template_api.enable('alias_tree_input_output_min')}
                    } else {
                      ${Input.template_api.disable('alias_tree_input_output_max')}
                      ${Input.template_api.disable('alias_tree_input_output_min')}
                    }
                  })
                  document.getElementById('alias_tree_checkbox_induction').addEventListener('click', (e)=>{
                    e.stopPropagation()
                    const s = ${Checkbox.template_api.get('alias_tree_checkbox_induction')}
                    if (s){
                      ${Input.template_api.enable('alias_tree_input_induction_from')}
                      ${Input.template_api.enable('alias_tree_input_induction_to')}
                      ${Input.template_api.enable('alias_tree_input_induction_step')}
                    } else {
                      ${Input.template_api.disable('alias_tree_input_induction_from')}
                      ${Input.template_api.disable('alias_tree_input_induction_to')}
                      ${Input.template_api.disable('alias_tree_input_induction_step')}
                    }
                  })


              }
            });
          </script>
          ${Checkbox.script()}
          ${Checkbox.style()}
          ${Select.script()}
          ${Select.style()}
          ${Input.script()}
          ${Input.style()}
        </body>
      </html>`;
      // console.log('SSS', html)
    return html
  }
}