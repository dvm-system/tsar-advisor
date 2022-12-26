// 3 state
// pure = 0
// not_pure = 1
// unknown = 2

const _pure_function_call_graph = function(id){
  return(`
    <div
      id="pure_function_container_${id}"
    >
      <div class="btn-group pure_function_call_graph_button_group" role="group">
        <button
          type="button"
          class="btn ${_pure_function_call_graph.state.data[id] == 1 ? 'btn-primary' : 'btn-light' }"
          id="${_pure_function_call_graph.state.class}_btn_pure_${id}"
        >
          Pure
        </button>
        <button
          type="button"
          class="btn ${_pure_function_call_graph.state.data[id] == 2 ? 'btn-primary' : 'btn-light' }"
          id="${_pure_function_call_graph.state.class}_btn_not_pure_${id}"
        >
          Not Pure
        </button>
        <button
          type="button"
          class="btn ${_pure_function_call_graph.state.data[id] == 0 ? 'btn-primary' : 'btn-light' }"
          id="${_pure_function_call_graph.state.class}}_btn_unknown_${id}"
        >
          Unknown
        </button>
      </div>
    </div>
  `)
}


  _pure_function_call_graph.state = {
    class: 'pure_function_call_graph',
    path: ['json_generator', 'pure_function', 'call_graph', 'active_state'],
    data: {},
    default_value: 0,
    events: function(){
      const tmp = this.action
      return(
        {
          [`${this.class}_btn_pure`]: {
            event : 'click',
            action : function(id){
              return tmp(id, 1)
            }
          },
          [`${this.class}_btn_not_pure`]: {
            event : 'click',
            action : function(id){
              return tmp(id, 2)
            }
          },
          [`${this.class}}_btn_unknown`] : {
            event : 'click',
            action : function(id){
              return tmp(id, 0)
            }
          },
        }
      )
    },
    render : function(store = null, options = null){

      // DEBUG
      // console.log(
      //   'RENDER_pure_function_call_graph_CALL_GRAPH_pure_function_call_graph:::',
      //   store ,
      //   this,
      //   ';'
      // )
      // DEBUG
      if(store && !(Object.keys(store).length === 0)){
        let data = store
        let check = false
        for (const dir of _pure_function_call_graph.state.path){
          if (dir in data){
            data = data[dir]
          } else {
            check = true
            break;
          }
        }
        if(!check)
          _pure_function_call_graph.state.data = data
      }

      if (document.getElementsByClassName(_pure_function_call_graph.state.class)){

        const ids = new Set()

        for (let item of document.getElementsByClassName(_pure_function_call_graph.state.class)) {
          if (!( item.id in _pure_function_call_graph.state.data ))
            _pure_function_call_graph.state.data[item.id] = _pure_function_call_graph.state.default_value
          item.innerHTML = _pure_function_call_graph(item.id)
          ids.add(item.id)
        }

        for( let id of ids){
          Object.entries(_pure_function_call_graph.state.events()).forEach(([el_id, d]) => {
            const el =  document.getElementById(`${el_id}_${id}`)
            if (el){
              el.removeEventListener(d.event, d.action(id))
              el.addEventListener(d.event, d.action(id))
            }
          })
        }

      }
    },
    save : function(){
      vscode.postMessage({
        command: 'store',
        path: _pure_function_call_graph.state.path,
        data : _pure_function_call_graph.state.data
      })
    },
    action : (id, val) => function(){
      _pure_function_call_graph.state.data[id] = val ;
      _pure_function_call_graph.state.render()
      _pure_function_call_graph.state.save()
    }
  }

  _pure_function_call_graph.state.render()