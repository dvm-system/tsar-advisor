'use strict'

import * as vscode from 'vscode';
import * as path from 'path';
import {decodeLocation, encodeLocation,
  projectLink, moveToCode, commandLink, numberHtml, styleLink,
  unavailableHtml, waitHtml, checkTrait} from './functions';
import * as log from './log';
import * as msg from './messages';
import {ProjectEngine, Project,
  ProjectContentProvider, ProjectContentProviderState} from './project';

/**
 * State of a loop tree content provider.
 */
class LoopTreeProviderState implements ProjectContentProviderState {
  private _provider: LoopTreeProvider;
  constructor(provider: LoopTreeProvider) { this._provider = provider; }
  response: any;
  get provider (): LoopTreeProvider { return this._provider;}
  dispose(): any {}
}

/**
 * Provides a general information about analyzed project.
 */
export class LoopTreeProvider implements ProjectContentProvider{
  static scheme = "tsar-looptree";
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  private _engine: ProjectEngine;

  constructor(engine: ProjectEngine) { this._engine = engine; }
  dispose() { this._onDidChange.dispose(); }

  /**
   * Returns new description of a project content provider state.
   */
  state(): LoopTreeProviderState {
    return new LoopTreeProviderState(this);
  }

  /**
   * Informs listeners about content changes.
   *
   * If this provider has been registered after call of this method
   * provideTextDocumentContent() will be called to update visible content.
   */
  update(project: Project) {
    this._onDidChange.fire(encodeLocation(LoopTreeProvider.scheme, project.uri));
  }

  /**
   * Returns event to subscribe for content changes.
   */
  get onDidChange(): vscode.Event<vscode.Uri> {
    return this._onDidChange.event;
  }

  /**
   * Provides html with general information about analyzed project.
   */
  public provideTextDocumentContent(uri: vscode.Uri): Thenable<string>|string {
    let prjUri = <vscode.Uri>decodeLocation(uri).shift();
    let project = this._engine.project(prjUri);
    if (project === undefined)
      return unavailableHtml(prjUri);
    let state = <LoopTreeProviderState>project.providerState(LoopTreeProvider.scheme);
    if (project.response !== undefined &&
        project.response instanceof msg.FunctionList)
      state.response = project.response;
    let response = project.response;
    return new Promise((resolve, reject) => {
      if (response !== undefined && response instanceof msg.FunctionList) {
        return resolve(this._provideFunctionList(project, response));
      } else if (response !== undefined && response instanceof msg.LoopTree) {
        return resolve(this._provideLoopTree(project, response));
      }
      return resolve(waitHtml(log.FunctionList.title, project));
    });
  }

  private _provideFunctionList(project: Project, funclst: msg.FunctionList): string {
    let bootstrap = vscode.Uri.file(
      path.resolve(__dirname, '..', '..', 'node_modules', 'bootstrap', 'dist'));
    let jquery = vscode.Uri.file(
      path.resolve(__dirname, '..', '..', 'node_modules', 'jquery', 'dist'));
    let bootstrapHeader =
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="description" content="">
          <meta name="author" content="">
          <title>Functions and Loop Tree</title>
          <link href="${bootstrap}/css/bootstrap.min.css" rel="stylesheet">
          <script src="${jquery}/jquery.min.js"></script>
          <script src="${bootstrap}/js/bootstrap.min.js"></script>
        </head>
        <body>`;
    let bootstrapFooter = `</body></html>`;
    let body =
      `   <table class="table table-hover">
            <tr><th>Functions and Loops</th><th>Is Analyzed</th><th>Perfect</th><th>Exit</th>
            <th>Level</th><th>Type</th><th>Readonly</th><th>NoReturn</th></tr>`;
    let funclen = funclst.Functions.length;
    for (let i = 0; i < funclen; i++) {
      let func = funclst.Functions[i];
      let looplen = func.Loops.length;
      /// TODO (dmitrij.murygin@bk.ru) : handle functions without loops.
      if (looplen) {
        body += `<tr><td><a href='' class='loops'>−</a>`;
      } else {
        body += `<tr><td>${commandLink('tsar.loop.tree', project, 'Loops', '+', `${func.ID}`)}`;
      }
      body += `${func.Name}</td><td>&#10003</td><td>N/A</td><td>N/A</td><td class='level'>0</td><td>N/A</td>` +
          checkTrait(func.Traits.Readonly) + checkTrait(func.Traits.NoReturn) + `</tr>`;
      for (let j = 0; j < looplen; j++) {
        let loop = func.Loops[j];
        if ((loop.Level == 1) && (j == looplen - 1 || func.Loops[j + 1].Level <= loop.Level)) {
          body += `<tr><td>`;
        } else if (j == looplen - 1 || func.Loops[j + 1].Level <= loop.Level) {
          body += `<tr class='hide'><td>`;
        } else if (loop.Level == 1) {
          body += `<tr class='subloops'><td>`;
        } else {
          body += `<tr class='hide subloops'><td>`;
        }
        for (let k = 0; k < loop.Level; k++) {
          body += `&emsp;`;
        }
        body += `<a href='' class='loops'></a>`;
        if ((loop.StartLocation.Line == loop.StartLocation.MacroLine) &&
            (loop.StartLocation.Column == loop.StartLocation.MacroColumn)) {
          let start = `${loop.StartLocation.Line}:${loop.StartLocation.Column}`;
          let end = `${loop.EndLocation.Line}:${loop.EndLocation.Column}`;
          body += `loop in ${func.Name} at
              ${moveToCode(project, start, start)} -
              ${moveToCode(project, end, end)}</td>`;
        } else {
          let macrostart = `${loop.StartLocation.MacroLine}:${loop.StartLocation.MacroColumn}`;
          let macroend = `${loop.EndLocation.MacroLine}:${loop.EndLocation.MacroColumn}`;
          let start = `${loop.StartLocation.Line}:${loop.StartLocation.Column}`;
          let end = `${loop.EndLocation.Line}:${loop.EndLocation.Column}`;
          body += `loop in ${func.Name} at
              ${moveToCode(project, start, start)}
              (${moveToCode(project, macrostart, macrostart)}) -
              ${moveToCode(project, end, end)}
              (${moveToCode(project, macroend, macroend)})</td>`;
        }
        body += checkTrait(loop.Traits.IsAnalyzed);
        if (loop.Traits.IsAnalyzed == "Yes") {
          body += checkTrait(loop.Traits.Perfect) + `<td>${loop.Exit}</td>`;
        } else {
          body += `<td>N/A</td><td>N/A</td>`;
        }
        body += `<td class='level'>${loop.Level}</td><td>${loop.Type}</td><td>N/A</td><td>N/A</td></tr>`;
      }
    }
    body += `</table>`;
    /// TODO (dmitrij.murygin@bk.ru) : keep subtrees of loops.
    let script = `
        <script>
          (function($, undefined) {
            $(function() {
              $('tr.hide').hide();
              $('tr.subloops td a.loops').text('+');
              $('tr td a.loops').on('click', function() {
                let text = $(this).text();
                let level = Number($(this).parents('tr').find('td.level').text());
                let a = $(this).parents('tr').next();
                let l = Number(a.find('td.level').text());
                while (l > level) {
                  if (text == '−') {
                    if (!a.hasClass('hide')) {
                      a.addClass('hide');
                      a.hide();
                    }
                    let al = a.find('td').find('a.loops');
                    if (al.text() == '−')
                      al.text('+');
                  } else {
                    if (l == level + 1) {
                      a.removeClass('hide');
                      a.show();
                    }
                  }
                  a = a.next();
                  l = Number(a.find('td.level').text());
                }
                if (text == '+') {
                  $(this).text('−');
                } else {
                  $(this).text('+');
                }
                return false;
              });
              return false;
            });
          })(jQuery);
        </script>`;
    return bootstrapHeader + body + script + bootstrapFooter;
  }

  private _provideLoopTree(project: Project, func: msg.LoopTree): string {
    let state = <LoopTreeProviderState>project.providerState(LoopTreeProvider.scheme);
    let funclist: msg.FunctionList = state.response;
    let funclen = funclist.Functions.length;
    for (let i = 0; i < funclen; i++) {
      if (funclist.Functions[i].ID != func.ID)
        continue;
      funclist.Functions[i].Loops = func.Loops;
      return this._provideFunctionList(project, funclist);
    }
    return `<!DOCTYPE html><html></html>`;
  }
}